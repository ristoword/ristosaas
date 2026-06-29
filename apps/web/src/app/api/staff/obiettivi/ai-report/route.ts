import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { createSseResponse } from "@/lib/ai/sse";
import { pickStatusMessage } from "@/lib/ai/stream-status";
import { resolveAgentWithPrompts } from "@/lib/ai/runtime/agent-resolver";
import { callLlmChatCompletion, resolveProviderApiKey, streamLlmChatCompletion } from "@/lib/ai/runtime/llm-provider";
import { buildTelemetry, logAiRequest, usageFromOpenAi } from "@/lib/ai/runtime/telemetry";

const STAFF_CONTEXT = "staff";

const MANAGER_ROLES = ["supervisor", "owner", "super_admin"] as const;

const REPORT_OVERLAY = `Sei il direttore AI di un ristorante. Analizza i dati giornalieri del personale e produci un report dettagliato e professionale in italiano.

Il report deve includere:
1. RIEPILOGO GENERALE: totale ordini, incasso, coperti del giorno
2. CLASSIFICA CAMERIERI: dal migliore al peggiore per incasso, con commenti su performance
3. ANALISI VENDITE PREMIUM: chi ha venduto bottiglie costose, upselling
4. PRESENZE E TURNI: chi è in servizio, ore lavorate
5. PREMI E RICONOSCIMENTI: premi assegnati oggi
6. RACCOMANDAZIONI AI: suggerimenti per migliorare performance, chi merita un premio, chi necessita formazione
7. VOTO GIORNATA: valutazione complessiva da 1 a 10

Sii preciso con i numeri, usa emoji per evidenziare punti importanti.
Formatta il report in modo leggibile con sezioni chiare.`;

async function buildStaffReportPayload(tenantId: string) {
  const today = new Date();
  const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today); endOfDay.setHours(23, 59, 59, 999);

  const orders = await prisma.restaurantOrder.findMany({
    where: { tenantId, createdAt: { gte: startOfDay, lte: endOfDay }, status: { notIn: ["annullato"] } },
    include: { items: true },
  });

  const waiterStats: Record<string, { orders: number; revenue: number; covers: number; tables: Set<string>; items: number; premiumBottles: number }> = {};

  for (const order of orders) {
    const w = order.waiter || "Sconosciuto";
    if (!waiterStats[w]) waiterStats[w] = { orders: 0, revenue: 0, covers: 0, tables: new Set(), items: 0, premiumBottles: 0 };
    const s = waiterStats[w];
    s.orders++;
    s.covers += order.covers ?? 0;
    if (order.table) s.tables.add(order.table);
    for (const item of order.items) {
      const p = Number(item.price ?? 0);
      s.revenue += p * item.qty;
      s.items += item.qty;
      const lc = item.name.toLowerCase();
      if (p >= 40 && (lc.includes("vino") || lc.includes("bottiglia") || lc.includes("champagne") || lc.includes("prosecco"))) {
        s.premiumBottles += item.qty;
      }
    }
  }

  const rewards = await prisma.staffReward.findMany({
    where: { tenantId, createdAt: { gte: startOfDay, lte: endOfDay } },
  });

  const shifts = await prisma.staffShift.findMany({
    where: { tenantId, clockInAt: { gte: startOfDay, lte: endOfDay } },
    include: { staffMember: { select: { name: true } } },
  });

  const staffSummary = Object.entries(waiterStats).map(([name, s]) => ({
    name,
    ordini: s.orders,
    coperti: s.covers,
    tavoli: s.tables.size,
    incasso: Math.round(s.revenue * 100) / 100,
    piatti_venduti: s.items,
    bottiglie_premium: s.premiumBottles,
    media_ordine: s.orders > 0 ? Math.round((s.revenue / s.orders) * 100) / 100 : 0,
  }));

  const userContent = JSON.stringify({
    data: today.toISOString().slice(0, 10),
    totale_ordini: orders.length,
    personale: staffSummary,
    premi_oggi: rewards.map((r) => ({
      staffName: r.staffName,
      type: r.type,
      description: r.description,
      value: r.value ? Number(r.value) : null,
    })),
    turni_oggi: shifts.map((s) => ({
      name: s.staffMember.name,
      clockIn: s.clockInAt.toISOString(),
      clockOut: s.clockOutAt?.toISOString() ?? "in corso",
    })),
  });

  return { userContent };
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, MANAGER_ROLES);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const payload = await body<{ stream?: boolean }>(req).catch(() => ({} as { stream?: boolean }));

  const startedAt = Date.now();
  const { runtime, prompts } = await resolveAgentWithPrompts(tenantId, STAFF_CONTEXT);
  if (!runtime.active) return err("Agente AI disattivato", 503);

  const providerApiKey = resolveProviderApiKey(runtime.provider);
  if (!providerApiKey) return err("Provider AI non configurato", 500);

  const { userContent } = await buildStaffReportPayload(tenantId);
  const generatedAt = new Date().toISOString();

  let systemPrompt = prompts.systemPrompt.trim() || REPORT_OVERLAY;
  if (prompts.userPrompt.trim()) {
    systemPrompt = `${systemPrompt}\n\n${prompts.userPrompt.trim()}`;
  }

  const llmBody = {
    model: runtime.model,
    temperature: Math.min(runtime.temperature, 0.4),
    max_tokens: Math.min(runtime.maxTokens, 2000),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  };

  if (payload.stream) {
    if (!runtime.streamingEnabled) return err("Streaming disattivato per questo agente", 503);

    return createSseResponse(async (emit, signal) => {
      emit({ type: "status", message: pickStatusMessage("staff", 0) });
      emit({ type: "status", message: pickStatusMessage("staff", 1) });
      emit({ type: "status", message: pickStatusMessage("staff", 2) });

      try {
        let report = "";
        const result = await streamLlmChatCompletion(
          runtime.provider,
          providerApiKey,
          llmBody,
          (token) => {
            report += token;
            emit({ type: "token", content: token });
          },
          signal,
        );
        report = result.content.trim() || "Nessun report generato.";

        const tokens = usageFromOpenAi(result.usage, userContent, report);
        await logAiRequest({
          tenantId,
          userId: guard.user.id,
          context: STAFF_CONTEXT,
          userMessage: "Report staff obiettivi",
          assistantMessage: report.slice(0, 4000),
          telemetry: buildTelemetry({
            runtime,
            ...tokens,
            durationMs: Date.now() - startedAt,
            ragUsed: false,
            ragDocumentsCount: 0,
          }),
        });

        emit({ type: "done", report, generatedAt });
      } catch (e) {
        if (signal.aborted) {
          emit({ type: "error", message: "Report interrotto" });
          return;
        }
        emit({ type: "error", message: e instanceof Error ? e.message : "Errore generazione report" });
      }
    }, req.signal);
  }

  const { content, usage } = await callLlmChatCompletion(
    runtime.provider,
    providerApiKey,
    llmBody,
  );

  const report = content?.trim() || "Nessun report generato.";

  const tokens = usageFromOpenAi(usage, userContent, report);
  await logAiRequest({
    tenantId,
    userId: guard.user.id,
    context: STAFF_CONTEXT,
    userMessage: "Report staff obiettivi",
    assistantMessage: report.slice(0, 4000),
    telemetry: buildTelemetry({
      runtime,
      ...tokens,
      durationMs: Date.now() - startedAt,
      ragUsed: false,
      ragDocumentsCount: 0,
    }),
  });

  return ok({ report, generatedAt });
}
