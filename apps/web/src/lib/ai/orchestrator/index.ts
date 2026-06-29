import { buildOrchestratorContext } from "@/lib/ai/orchestrator/context";
import { executeModules } from "@/lib/ai/orchestrator/executor";
import { planOrchestration } from "@/lib/ai/orchestrator/planner";
import {
  buildOrchestratorResponse,
  streamUnifiedResponse,
  unifyAiResponse,
} from "@/lib/ai/orchestrator/response";
import type { OrchestratorRequest, OrchestratorResponse, OrchestratorRunOptions } from "@/lib/ai/orchestrator/types";
import { recordMemoryExchange } from "@/lib/ai/memory/context-manager";
import { createSseResponse, type SseEmitter } from "@/lib/ai/sse";

export async function runOrchestrator(options: OrchestratorRunOptions): Promise<OrchestratorResponse> {
  const { tenantId, userId, request, signal } = options;

  if (!request.query?.trim()) {
    return buildOrchestratorResponse({
      query: "",
      plan: { modules: ["dashboard"], reasoning: "Query vuota — fallback dashboard", source: "rules" },
      modules: [],
      ctx: await buildOrchestratorContext({ tenantId, userId, request }),
      reply: "Inserisci una domanda operativa per ricevere un'analisi unificata.",
      source: "rules",
    });
  }

  const ctx = await buildOrchestratorContext({ tenantId, userId, request });

  const plan = await planOrchestration(request.query, {
    contextHint: request.contextHint,
    locale: request.locale,
    useAi: request.enrich !== false,
    signal,
    tenantId,
  });

  const modules = await executeModules(plan.modules, ctx, { enrich: false });

  const reply = await unifyAiResponse(request.query, plan, modules, ctx, signal);

  const hasAiLayer = plan.source === "rules+ai" || Boolean(process.env.OPENAI_API_KEY?.trim());

  if (userId) {
    await recordMemoryExchange({
      tenantId,
      userId,
      channel: "orchestrator",
      context: request.contextHint ?? "orchestrator",
      userMessage: request.query,
      assistantMessage: reply,
      metadata: { modules: plan.modules, source: hasAiLayer ? "rules+ai" : "rules" },
      locale: request.locale,
    });
  }

  return buildOrchestratorResponse({
    query: request.query,
    plan,
    modules,
    ctx,
    reply,
    source: hasAiLayer ? "rules+ai" : "rules",
  });
}

export function runOrchestratorStream(
  options: OrchestratorRunOptions,
  reqSignal?: AbortSignal,
): Response {
  return createSseResponse(async (emit, signal) => {
    await runOrchestratorStreamInner(options, emit, signal);
  }, reqSignal);
}

async function runOrchestratorStreamInner(
  options: OrchestratorRunOptions,
  emit: SseEmitter,
  signal: AbortSignal,
): Promise<void> {
  const { tenantId, userId, request } = options;

  if (!request.query?.trim()) {
    emit({ type: "error", message: "Query vuota" });
    emit({ type: "done", reply: "Inserisci una domanda operativa." });
    return;
  }

  emit({ type: "status", message: "Orchestratore: analisi richiesta…" });

  const ctx = await buildOrchestratorContext({ tenantId, userId, request });
  emit({ type: "status", message: "Orchestratore: pianificazione moduli…" });

  const plan = await planOrchestration(request.query, {
    contextHint: request.contextHint,
    locale: request.locale,
    useAi: request.enrich !== false,
    signal,
    tenantId,
  });

  emit({ type: "status", message: `Orchestratore: consulto ${plan.modules.join(", ")}…` });

  const modules = await executeModules(plan.modules, ctx, { enrich: false });

  const reply = await streamUnifiedResponse(request.query, plan, modules, ctx, emit, signal);

  if (userId) {
    await recordMemoryExchange({
      tenantId,
      userId,
      channel: "orchestrator",
      context: request.contextHint ?? "orchestrator",
      userMessage: request.query,
      assistantMessage: reply,
      metadata: { modules: plan.modules },
      locale: request.locale,
    });
  }

  emit({
    type: "done",
    reply,
    source: plan.source === "rules+ai" ? "rules+ai" : "rules",
    generatedAt: new Date().toISOString(),
  });
}

export type { OrchestratorRequest, OrchestratorResponse };
