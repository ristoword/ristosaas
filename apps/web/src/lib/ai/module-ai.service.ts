import {
  getModuleDefinition,
  MODULE_STATUS_KEYS,
  normalizeModuleId,
} from "@/lib/ai/modules/config";
import type { ModuleAiRequest, ModuleAiResponse, ModuleId } from "@/lib/ai/modules/types";
import { callLlmChatCompletion, resolveProviderApiKey, streamLlmChatCompletion } from "@/lib/ai/runtime/llm-provider";
import { augmentSystemPrompt, recordMemoryExchange } from "@/lib/ai/memory/context-manager";
import { createSseResponse, type SseEmitter } from "@/lib/ai/sse";
import { pickStatusMessage } from "@/lib/ai/stream-status";
import { resolveAgentWithPrompts } from "@/lib/ai/runtime/agent-resolver";
import { retrieveAgentRagContext } from "@/lib/ai/runtime/rag-context";
import { buildTelemetry, logAiRequest, usageFromOpenAi } from "@/lib/ai/runtime/telemetry";
import { legacySystemPromptForContext } from "@/lib/ai/chat-core";

async function buildModuleSystemPrompt(params: {
  moduleId: ModuleId;
  tenantId: string;
  userId?: string;
  locale: string;
  query: string;
}) {
  const def = getModuleDefinition(params.moduleId);
  const { runtime, prompts } = await resolveAgentWithPrompts(params.tenantId, params.moduleId);
  const lang = params.locale.startsWith("en") ? "English" : "italiano";

  let systemPrompt =
    prompts.systemPrompt.trim() ||
    legacySystemPromptForContext(params.moduleId, false, params.locale);

  if (prompts.userPrompt.trim()) {
    systemPrompt = `${systemPrompt}\n\n${prompts.userPrompt.trim()}`;
  }

  systemPrompt = `${systemPrompt}

Sei l'assistente AI operativo di RistoSimply per il modulo "${params.moduleId}" (${runtime.agentName}).
Il tuo compito è interpretare i dati rule-based già calcolati dal gestionale e produrre insight operativi concreti.

Regole:
- NON inventare numeri: usa solo quelli presenti nello snapshot JSON.
- Mantieni la logica rule-based come fonte di verità; tu aggiungi priorità, rischi e azioni suggerite.
- Rispondi in ${lang}, tono professionale da responsabile di reparto.
- Struttura: 1) Sintesi (2-3 righe) 2) Alert/priorità 3) Azioni consigliate (max 5 bullet).
- Focus del modulo: ${def.focus}.`;

  if (params.userId && runtime.memoryEnabled) {
    systemPrompt = await augmentSystemPrompt(systemPrompt, {
      tenantId: params.tenantId,
      userId: params.userId,
      query: params.query,
      context: params.moduleId,
      channel: "module",
      locale: params.locale,
      memoryEnabled: runtime.memoryEnabled,
    });
  }

  return { systemPrompt, runtime };
}

async function buildModuleSnapshotPrompt(params: {
  moduleId: ModuleId;
  snapshot: unknown;
  systemPrompt: string;
  runtime: Awaited<ReturnType<typeof buildModuleSystemPrompt>>["runtime"];
  apiKey: string;
  tenantId: string;
  query: string;
}) {
  let userContent = `Snapshot rule-based (JSON):\n${JSON.stringify(params.snapshot, null, 0).slice(0, 12000)}`;

  const rag = await retrieveAgentRagContext({
    query: params.query,
    apiKey: params.apiKey,
    tenantId: params.tenantId,
    module: params.runtime.module,
    ragEnabled: params.runtime.ragEnabled,
    vectorEnabled: params.runtime.vectorEnabled,
  });

  if (rag.context) {
    userContent = `${rag.context}\n\n${userContent}`;
  }

  return { userContent, rag };
}

async function generateInsights(
  moduleId: ModuleId,
  snapshot: unknown,
  options: { locale?: string; signal?: AbortSignal; tenantId?: string; userId?: string },
): Promise<string | null> {
  if (!options.tenantId) return null;

  const locale = options.locale ?? "it";
  const startedAt = Date.now();
  const { systemPrompt, runtime } = await buildModuleSystemPrompt({
    moduleId,
    tenantId: options.tenantId,
    userId: options.userId,
    locale,
    query: `modulo ${moduleId}`,
  });

  if (!runtime.active) return null;

  const apiKey = resolveProviderApiKey(runtime.provider);
  if (!apiKey) return null;

  const { userContent, rag } = await buildModuleSnapshotPrompt({
    moduleId,
    snapshot,
    systemPrompt,
    runtime,
    apiKey,
    tenantId: options.tenantId,
    query: `modulo ${moduleId}`,
  });

  const { content, usage } = await callLlmChatCompletion(
    runtime.provider,
    apiKey,
    {
      model: runtime.model,
      temperature: runtime.temperature,
      max_tokens: Math.min(runtime.maxTokens, 900),
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: userContent,
        },
      ],
    },
    options.signal,
  );

  const insights = content?.trim() || null;

  if (options.userId && insights) {
    const tokens = usageFromOpenAi(usage, `modulo ${moduleId}`, insights);
    await logAiRequest({
      tenantId: options.tenantId,
      userId: options.userId,
      context: moduleId,
      userMessage: `Insight modulo ${moduleId}`,
      assistantMessage: insights,
      telemetry: buildTelemetry({
        runtime,
        ...tokens,
        durationMs: Date.now() - startedAt,
        ragUsed: rag.used,
        ragDocumentsCount: rag.documentCount,
      }),
    });
  }

  return insights;
}

async function streamInsights(
  moduleId: ModuleId,
  snapshot: unknown,
  emit: SseEmitter,
  options: { locale?: string; signal?: AbortSignal; tenantId?: string; userId?: string },
): Promise<string | null> {
  if (!options.tenantId) {
    emit({ type: "error", message: "Tenant non configurato" });
    return null;
  }

  const statusKey = MODULE_STATUS_KEYS[moduleId] ?? "default";
  emit({ type: "status", message: pickStatusMessage(statusKey, 0) });
  emit({ type: "status", message: pickStatusMessage(statusKey, 1) });

  const locale = options.locale ?? "it";
  const startedAt = Date.now();
  const { systemPrompt, runtime } = await buildModuleSystemPrompt({
    moduleId,
    tenantId: options.tenantId,
    userId: options.userId,
    locale,
    query: `modulo ${moduleId}`,
  });

  if (!runtime.active || !runtime.streamingEnabled) {
    emit({ type: "error", message: "Agente disattivato o streaming off" });
    return null;
  }

  const apiKey = resolveProviderApiKey(runtime.provider);
  if (!apiKey) {
    emit({ type: "error", message: "Provider AI non configurato" });
    return null;
  }

  const { userContent, rag } = await buildModuleSnapshotPrompt({
    moduleId,
    snapshot,
    systemPrompt,
    runtime,
    apiKey,
    tenantId: options.tenantId,
    query: `modulo ${moduleId}`,
  });

  const { content, usage } = await streamLlmChatCompletion(
    runtime.provider,
    apiKey,
    {
      model: runtime.model,
      temperature: runtime.temperature,
      max_tokens: Math.min(runtime.maxTokens, 900),
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: userContent,
        },
      ],
    },
    (token) => emit({ type: "token", content: token }),
    options.signal,
  );

  const insights = content.trim() || null;

  if (options.userId && insights) {
    const tokens = usageFromOpenAi(usage, `modulo ${moduleId}`, insights);
    await logAiRequest({
      tenantId: options.tenantId,
      userId: options.userId,
      context: moduleId,
      userMessage: `Insight modulo ${moduleId}`,
      assistantMessage: insights,
      telemetry: buildTelemetry({
        runtime,
        ...tokens,
        durationMs: Date.now() - startedAt,
        ragUsed: rag.used,
        ragDocumentsCount: rag.documentCount,
      }),
    });
  }

  return insights;
}

export async function runModuleAi(
  moduleSlug: string,
  ctx: { tenantId: string; userId?: string },
  req: ModuleAiRequest = {},
): Promise<ModuleAiResponse | null> {
  const moduleId = normalizeModuleId(moduleSlug);
  if (!moduleId) return null;

  const def = getModuleDefinition(moduleId);
  const snapshot = await def.buildSnapshot({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    periodDays: req.periodDays,
  });

  const generatedAt = new Date().toISOString();
  let insights: string | null = null;

  if (req.enrich) {
    insights = await generateInsights(moduleId, snapshot, {
      locale: req.locale,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    });
  }

  if (req.enrich && insights && ctx.userId) {
    const { runtime } = await resolveAgentWithPrompts(ctx.tenantId, moduleId);
    await recordMemoryExchange({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      channel: "module",
      context: moduleId,
      userMessage: `Insight modulo ${moduleId}`,
      assistantMessage: insights,
      locale: req.locale,
      memoryEnabled: runtime.memoryEnabled,
    });
  }

  return {
    module: moduleId,
    generatedAt,
    snapshot,
    insights,
    source: insights ? "rules+ai" : "rules",
  };
}

export function runModuleAiStream(
  moduleSlug: string,
  ctx: { tenantId: string; userId?: string },
  req: ModuleAiRequest,
  reqSignal?: AbortSignal,
): Response | null {
  const moduleId = normalizeModuleId(moduleSlug);
  if (!moduleId) return null;

  return createSseResponse(async (emit, signal) => {
    const def = getModuleDefinition(moduleId);
    const snapshot = await def.buildSnapshot({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      periodDays: req.periodDays,
    });

    const generatedAt = new Date().toISOString();
    emit({
      type: "meta",
      data: { module: moduleId, generatedAt, snapshot, source: "rules" },
    });

    const insights = await streamInsights(moduleId, snapshot, emit, {
      locale: req.locale,
      signal,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    });

    if (insights && ctx.userId) {
      const { runtime } = await resolveAgentWithPrompts(ctx.tenantId, moduleId);
      await recordMemoryExchange({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        channel: "module",
        context: moduleId,
        userMessage: `Insight modulo ${moduleId}`,
        assistantMessage: insights,
        locale: req.locale,
        memoryEnabled: runtime.memoryEnabled,
      });
    }

    emit({
      type: "done",
      reply: insights ?? undefined,
      source: insights ? "rules+ai" : "rules",
      generatedAt,
    });
  }, reqSignal);
}

export { normalizeModuleId };
