import { NextRequest } from "next/server";
import { err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { guestFolioRepository } from "@/lib/db/repositories/guest-folio.repository";
import { customersRepository } from "@/lib/db/repositories/customers.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { actorFromRequest, writeFolioAudit } from "@/lib/hotel/folio-service";
import { buildFolioAiPromptContext, explainCharge } from "@/lib/hotel/folio-ai-service";
import { enrichCharge } from "@/lib/hotel/folio-utils";
import { DEFAULT_MODEL, MAX_TOKENS, TEMPERATURE, type AiMessage } from "@/lib/ai/chat-core";
import { callOpenAIChatCompletion, streamOpenAIChatCompletion } from "@/lib/ai/openai-stream";
import { recordMemoryExchange, augmentSystemPrompt } from "@/lib/ai/memory/context-manager";
import { createSseResponse, type SseEmitter } from "@/lib/ai/sse";
import { prisma } from "@/lib/db/prisma";
import { body } from "@/lib/api/helpers";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin", "supervisor", "cassa"] as const;

type Ctx = { params: Promise<{ id: string }> };

async function loadFolioContext(tenantId: string, folioId: string) {
  const detail = await guestFolioRepository.getDetail(tenantId, folioId);
  if (!detail) return null;

  let reservation = null;
  if (detail.folio.reservationId) {
    reservation = await prisma.hotelReservation.findFirst({
      where: { id: detail.folio.reservationId, tenantId },
    });
  }

  const customers = await customersRepository.all(tenantId);
  const customer = customers.find((c) => c.id === detail.folio.customerId) ?? null;

  return {
    detail,
    reservation: reservation
      ? {
          id: reservation.id,
          customerId: reservation.customerId,
          guestName: reservation.guestName,
          phone: reservation.phone ?? "",
          email: reservation.email ?? "",
          roomId: reservation.roomId,
          checkInDate: reservation.checkInDate.toISOString().slice(0, 10),
          checkOutDate: reservation.checkOutDate.toISOString().slice(0, 10),
          guests: reservation.guests,
          status: reservation.status,
          roomType: reservation.roomType,
          boardType: reservation.boardType,
          nights: reservation.nights,
          rate: reservation.rate.toNumber(),
          documentCode: reservation.documentCode ?? "",
        }
      : null,
    customer,
  };
}

async function runFolioChatStream(
  params: {
    tenantId: string;
    userId: string;
    folioId: string;
    message: string;
    history: AiMessage[];
    locale: string;
    apiKey: string;
  },
  emit: SseEmitter,
  signal?: AbortSignal,
) {
  const loaded = await loadFolioContext(params.tenantId, params.folioId);
  if (!loaded) {
    emit({ type: "error", message: "Folio non trovato" });
    return;
  }

  const folioContext = buildFolioAiPromptContext({
    detail: loaded.detail,
    reservation: loaded.reservation,
    customer: loaded.customer,
    locale: params.locale,
  });

  let systemPrompt = `Sei l'AI Concierge e Financial Assistant di RistoSimply per il Guest Folio.
Assist Reception, Front Office e Amministrazione analizzando il conto ospite in tempo reale.
Rispondi in modo professionale, sintetico e basato SOLO sui dati del folio forniti.
Per pagamenti, checkout, email e PDF: proponi azioni ma NON eseguirle — serve sempre conferma umana.
Puoi: spiegare addebiti, trovare movimenti, verificare anomalie, suggerire upsell, assistere al checkout.

${folioContext}`;

  systemPrompt = await augmentSystemPrompt(systemPrompt, {
    tenantId: params.tenantId,
    userId: params.userId,
    query: params.message,
    context: "folio",
    channel: "chat",
    locale: params.locale,
  });

  const messages = [
    { role: "system", content: systemPrompt },
    ...params.history.filter((h) => h.content?.trim()),
    { role: "user", content: params.message },
  ];

  emit({ type: "status", message: "Analisi folio in corso…" });

  const { content } = await streamOpenAIChatCompletion(
    params.apiKey,
    {
      model: DEFAULT_MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages,
    },
    (token) => emit({ type: "token", content: token }),
    signal,
  );

  const reply = content?.trim() || "Non ho potuto generare una risposta.";

  await writeFolioAudit({
    tenantId: params.tenantId,
    folioId: params.folioId,
    action: "ai_chat",
    newValue: params.message.slice(0, 200),
    actor: { userId: params.userId },
  });

  await recordMemoryExchange({
    tenantId: params.tenantId,
    userId: params.userId,
    channel: "chat",
    context: "folio",
    userMessage: params.message,
    assistantMessage: reply,
    locale: params.locale,
  });

  emit({ type: "done", reply });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;

  const { id: folioId } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();

  const payload = await body<{
    message?: string;
    history?: AiMessage[];
    locale?: string;
    stream?: boolean;
    chargeId?: string;
  }>(req);

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return err("OPENAI_API_KEY non configurata", 500);

  const message = payload.message?.trim();
  if (!message) return err("message is required");

  const locale = (payload.locale || "it").trim().toLowerCase();
  const history = Array.isArray(payload.history) ? payload.history.slice(-8) : [];

  if (payload.stream) {
    return createSseResponse(
      (emit, signal) =>
        runFolioChatStream(
          {
            tenantId,
            userId: guard.user.id,
            folioId,
            message,
            history,
            locale,
            apiKey,
          },
          emit,
          signal,
        ),
      req.signal,
    );
  }

  const loaded = await loadFolioContext(tenantId, folioId);
  if (!loaded) return err("Folio not found", 404);

  const folioContext = buildFolioAiPromptContext({
    detail: loaded.detail,
    reservation: loaded.reservation,
    customer: loaded.customer,
    locale,
  });

  const { content } = await callOpenAIChatCompletion(apiKey, {
    model: DEFAULT_MODEL,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: "system",
        content: `Assistente Guest Folio RistoSimply. Usa SOLO i dati forniti.\n\n${folioContext}`,
      },
      ...history,
      { role: "user", content: message },
    ],
  });

  await writeFolioAudit({
    tenantId,
    folioId,
    action: "ai_chat",
    newValue: message.slice(0, 200),
    actor: actorFromRequest(guard.user, req.headers),
  });

  return Response.json({ reply: content?.trim() || "" });
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;

  const { id: folioId } = await ctx.params;
  const chargeId = req.nextUrl.searchParams.get("chargeId");
  if (!chargeId) return err("chargeId query param required for explain", 400);

  const tenantId = guard.user.tenantId || getTenantId();
  const detail = await guestFolioRepository.getDetail(tenantId, folioId);
  if (!detail) return err("Folio not found", 404);

  const charge = detail.charges.find((c) => c.id === chargeId);
  if (!charge) return err("Charge not found", 404);

  const explanation = explainCharge(enrichCharge(charge));

  await writeFolioAudit({
    tenantId,
    folioId,
    chargeId,
    action: "ai_explain_charge",
    newValue: charge.description,
    actor: actorFromRequest(guard.user, req.headers),
  });

  return Response.json({ explanation });
}
