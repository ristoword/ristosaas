import { NextRequest } from "next/server";
import { err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { guestFolioRepository } from "@/lib/db/repositories/guest-folio.repository";
import { customersRepository } from "@/lib/db/repositories/customers.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { actorFromRequest, writeFolioAudit } from "@/lib/hotel/folio-service";
import { buildFolioAiPromptContext, explainCharge } from "@/lib/hotel/folio-ai-service";
import { enrichCharge } from "@/lib/hotel/folio-utils";
import { legacySystemPromptForContext, type AiMessage } from "@/lib/ai/chat-core";
import { callLlmChatCompletion, resolveProviderApiKey, streamLlmChatCompletion } from "@/lib/ai/runtime/llm-provider";
import { augmentSystemPrompt, recordMemoryExchange } from "@/lib/ai/memory/context-manager";
import { createSseResponse, type SseEmitter } from "@/lib/ai/sse";
import { resolveAgentWithPrompts } from "@/lib/ai/runtime/agent-resolver";
import { retrieveAgentRagContext } from "@/lib/ai/runtime/rag-context";
import { retrieveWebSearchContext } from "@/lib/ai/runtime/web-search";
import { buildTelemetry, logAiRequest, usageFromOpenAi } from "@/lib/ai/runtime/telemetry";
import { prisma } from "@/lib/db/prisma";
import { body } from "@/lib/api/helpers";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin", "supervisor", "cassa"] as const;
const FOLIO_CONTEXT = "folio";

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

async function buildFolioSystemPrompt(params: {
  tenantId: string;
  userId: string;
  message: string;
  locale: string;
  folioContext: string;
  apiKey: string;
}) {
  const startedAt = Date.now();
  const { runtime, prompts } = await resolveAgentWithPrompts(params.tenantId, FOLIO_CONTEXT);
  const providerApiKey = resolveProviderApiKey(runtime.provider) ?? params.apiKey;

  const [rag, webSearch] = await Promise.all([
    retrieveAgentRagContext({
      query: params.message,
      apiKey: providerApiKey,
      tenantId: params.tenantId,
      module: runtime.module,
      ragEnabled: runtime.ragEnabled,
      vectorEnabled: runtime.vectorEnabled,
    }),
    retrieveWebSearchContext({
      query: params.message,
      webSearchEnabled: runtime.webSearchEnabled,
    }),
  ]);

  let systemPrompt =
    prompts.systemPrompt.trim() ||
    legacySystemPromptForContext(FOLIO_CONTEXT, false, params.locale);

  if (prompts.userPrompt.trim()) {
    systemPrompt = `${systemPrompt}\n\n${prompts.userPrompt.trim()}`;
  }

  systemPrompt = `${systemPrompt}\n\nDati Guest Folio (tempo reale):\n${params.folioContext}`;

  if (webSearch.context) {
    systemPrompt = `${systemPrompt}\n\n${webSearch.context}`;
  }

  if (rag.context) {
    systemPrompt = `${systemPrompt}\n\n${rag.context}`;
  }

  if (runtime.memoryEnabled) {
    systemPrompt = await augmentSystemPrompt(systemPrompt, {
      tenantId: params.tenantId,
      userId: params.userId,
      query: params.message,
      context: FOLIO_CONTEXT,
      channel: "chat",
      locale: params.locale,
      memoryEnabled: runtime.memoryEnabled,
    });
  }

  return { systemPrompt, runtime, rag, webSearch, startedAt, providerApiKey };
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

  const { systemPrompt, runtime, rag, webSearch, startedAt, providerApiKey } = await buildFolioSystemPrompt({
    tenantId: params.tenantId,
    userId: params.userId,
    message: params.message,
    locale: params.locale,
    folioContext,
    apiKey: params.apiKey,
  });

  if (!providerApiKey) {
    emit({ type: "error", message: "Provider AI non configurato" });
    return;
  }

  if (!runtime.active) {
    emit({ type: "error", message: "Agente Guest Folio disattivato" });
    return;
  }

  if (!runtime.streamingEnabled) {
    emit({ type: "error", message: "Streaming disattivato per questo agente" });
    return;
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...params.history.filter((h) => h.content?.trim()),
    { role: "user", content: params.message },
  ];

  emit({ type: "status", message: "Analisi folio in corso…" });

  const { content, usage } = await streamLlmChatCompletion(
    runtime.provider,
    providerApiKey,
    {
      model: runtime.model,
      temperature: runtime.temperature,
      max_tokens: runtime.maxTokens,
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

  const tokens = usageFromOpenAi(usage, params.message, reply);
  await logAiRequest({
    tenantId: params.tenantId,
    userId: params.userId,
    context: FOLIO_CONTEXT,
    userMessage: params.message,
    assistantMessage: reply,
    telemetry: buildTelemetry({
      runtime,
      ...tokens,
      durationMs: Date.now() - startedAt,
      ragUsed: rag.used,
      ragDocumentsCount: rag.documentCount,
      webSearchUsed: webSearch.used,
      webSearchResultsCount: webSearch.resultCount,
    }),
  });

  if (runtime.memoryEnabled) {
    await recordMemoryExchange({
      tenantId: params.tenantId,
      userId: params.userId,
      channel: "chat",
      context: FOLIO_CONTEXT,
      userMessage: params.message,
      assistantMessage: reply,
      locale: params.locale,
      memoryEnabled: runtime.memoryEnabled,
    });
  }

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

  const { systemPrompt, runtime, rag, webSearch, startedAt, providerApiKey } = await buildFolioSystemPrompt({
    tenantId,
    userId: guard.user.id,
    message,
    locale,
    folioContext,
    apiKey,
  });

  if (!runtime.active) return err("Agente Guest Folio disattivato", 503);
  if (!providerApiKey) return err("Provider AI non configurato", 500);

  const { content, usage } = await callLlmChatCompletion(
    runtime.provider,
    providerApiKey,
    {
      model: runtime.model,
      temperature: runtime.temperature,
      max_tokens: runtime.maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: message },
      ],
    },
  );

  const reply = content?.trim() || "";

  await writeFolioAudit({
    tenantId,
    folioId,
    action: "ai_chat",
    newValue: message.slice(0, 200),
    actor: actorFromRequest(guard.user, req.headers),
  });

  const tokens = usageFromOpenAi(usage, message, reply);
  await logAiRequest({
    tenantId,
    userId: guard.user.id,
    context: FOLIO_CONTEXT,
    userMessage: message,
    assistantMessage: reply,
    telemetry: buildTelemetry({
      runtime,
      ...tokens,
      durationMs: Date.now() - startedAt,
      ragUsed: rag.used,
      ragDocumentsCount: rag.documentCount,
      webSearchUsed: webSearch.used,
      webSearchResultsCount: webSearch.resultCount,
    }),
  });

  if (runtime.memoryEnabled && reply) {
    await recordMemoryExchange({
      tenantId,
      userId: guard.user.id,
      channel: "chat",
      context: FOLIO_CONTEXT,
      userMessage: message,
      assistantMessage: reply,
      locale,
      memoryEnabled: runtime.memoryEnabled,
    });
  }

  return Response.json({ reply });
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
