import {
  legacySystemPromptForContext,
  type OpenAiMessage,
  RISTO_ROLES,
} from "@/lib/ai/chat-core";
import { runModuleAi } from "@/lib/ai/module-ai.service";
import { retrieveAgentRagContext } from "@/lib/ai/runtime/rag-context";
import { resolveAgentWithPrompts } from "@/lib/ai/runtime/agent-resolver";
import { buildTelemetry, logAiRequest, usageFromOpenAi } from "@/lib/ai/runtime/telemetry";
import { executeRistoTool, RISTO_TOOLS } from "@/lib/ai/risto-tools";
import { callLlmChatCompletion, resolveProviderApiKey, streamLlmChatCompletion, supportsToolCalling } from "@/lib/ai/runtime/llm-provider";
import { pickStatusMessage } from "@/lib/ai/stream-status";
import { augmentSystemPrompt, recordMemoryExchange } from "@/lib/ai/memory/context-manager";
import type { SseEmitter } from "@/lib/ai/sse";
import { VoiceConversation } from "@/lib/ai/voice/conversation";
import { planVoiceTurn } from "@/lib/ai/voice/planner";
import type { OrchestratorModuleId } from "@/lib/ai/orchestrator/types";
import type { VoicePlan, VoiceTurnResult } from "@/lib/ai/voice/types";
import { createSseResponse } from "@/lib/ai/sse";

const MODULE_SLUG: Record<OrchestratorModuleId, string> = {
  sala: "sala",
  kitchen: "kitchen",
  foodcost: "foodcost",
  inventory: "inventory",
  cantina: "cantina",
  bar: "bar",
  pizzeria: "pizzeria",
  crm: "crm",
  hotel: "hotel",
  reception: "reception",
  housekeeping: "housekeeping",
  prenotazioni: "prenotazioni",
  catering: "catering",
  dashboard: "dashboard",
  supervisor: "supervisor",
  staff: "staff",
  turni: "turni",
  haccp: "haccp",
  hardware: "hardware",
};

async function fetchModuleSnapshots(
  modules: OrchestratorModuleId[],
  tenantId: string,
  userId: string,
  locale: string,
) {
  const results = await Promise.all(
    modules.map(async (module) => {
      const slug = MODULE_SLUG[module];
      const response = await runModuleAi(slug, { tenantId, userId }, { enrich: false, locale });
      return { module, snapshot: response?.snapshot ?? null };
    }),
  );
  return results.filter((r) => r.snapshot != null);
}

function buildVoiceSystemPrompt(params: {
  plan: VoicePlan;
  locale: string;
  moduleData: Array<{ module: OrchestratorModuleId; snapshot: unknown }>;
  ragContext: string | null;
  agentSystemPrompt: string;
}): string {
  const { plan, locale, moduleData, ragContext, agentSystemPrompt } = params;
  const base = agentSystemPrompt.trim() || legacySystemPromptForContext(plan.primaryContext, plan.enableTools, locale);

  const moduleBlock = moduleData
    .map(
      (m) =>
        `[Modulo ${m.module} — dati rule-based tenant]\n${JSON.stringify(m.snapshot, null, 0).slice(0, 3000)}`,
    )
    .join("\n\n");

  return [
    base,
    "Sei in modalità Voice Assistant: risposte concise, adatte alla sintesi vocale.",
    "Mantieni il contesto della conversazione precedente.",
    "Per azioni operative usa i tool disponibili. Per domande informative usa i dati moduli.",
    moduleBlock ? `\nDati moduli consultati:\n${moduleBlock}` : "",
    ragContext ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function buildVoiceMessages(params: {
  tenantId: string;
  userId: string;
  userRole: string;
  transcript: string;
  plan: VoicePlan;
  locale: string;
  history: OpenAiMessage[];
  apiKey: string;
  emit?: SseEmitter;
}): Promise<{
  messages: OpenAiMessage[];
  canUseTools: boolean;
  runtime: Awaited<ReturnType<typeof resolveAgentWithPrompts>>["runtime"];
  ragDocumentCount: number;
  startedAt: number;
  providerApiKey: string;
}> {
  const { plan, locale, emit, userRole } = params;

  emit?.({ type: "status", message: "Consulto moduli AI…" });
  const moduleData = await fetchModuleSnapshots(
    plan.modules,
    params.tenantId,
    params.userId,
    locale,
  );

  emit?.({ type: "status", message: pickStatusMessage(plan.primaryContext, 1) });
  const { runtime, prompts } = await resolveAgentWithPrompts(params.tenantId, plan.primaryContext);
  const providerApiKey = resolveProviderApiKey(runtime.provider) ?? params.apiKey;

  let ragContext: string | null = null;
  let ragDocumentCount = 0;
  try {
    const rag = await retrieveAgentRagContext({
      query: params.transcript,
      apiKey: providerApiKey,
      tenantId: params.tenantId,
      module: runtime.module,
      ragEnabled: runtime.ragEnabled,
      vectorEnabled: runtime.vectorEnabled,
    });
    ragContext = rag.context;
    ragDocumentCount = rag.documentCount;
  } catch {
    /* non-blocking */
  }

  const systemPrompt = await augmentSystemPrompt(
    buildVoiceSystemPrompt({
      plan,
      locale,
      moduleData,
      ragContext,
      agentSystemPrompt: prompts.systemPrompt,
    }),
    {
      tenantId: params.tenantId,
      userId: params.userId,
      query: params.transcript,
      context: plan.primaryContext,
      channel: "voice",
      locale,
      memoryEnabled: runtime.memoryEnabled,
    },
  );
  const canUseTools =
    runtime.toolCallingEnabled &&
    supportsToolCalling(runtime.provider) &&
    plan.enableTools &&
    (RISTO_ROLES as readonly string[]).includes(userRole);

  const messages: OpenAiMessage[] = [
    { role: "system", content: systemPrompt },
    ...params.history.filter((m) => m.role === "user" || m.role === "assistant"),
    { role: "user", content: params.transcript },
  ];

  emit?.({
    type: "meta",
    data: {
      plan,
      modulesUsed: moduleData.map((m) => m.module),
      ragUsed: Boolean(ragContext),
    },
  });

  return { messages, canUseTools, runtime, ragDocumentCount, startedAt: Date.now(), providerApiKey };
}

export async function executeVoiceTurn(params: {
  tenantId: string;
  userId: string;
  userRole: string;
  sessionId: string;
  transcript: string;
  locale?: string;
  signal?: AbortSignal;
}): Promise<VoiceTurnResult> {
  const conversation = VoiceConversation.resume(params.sessionId);
  if (!conversation) throw new Error("Sessione voice non valida");

  const locale = params.locale ?? conversation.getSession()?.locale ?? "it";
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  conversation.addUserMessage(params.transcript);

  const plan = await planVoiceTurn(params.transcript, {
    locale,
    useAi: Boolean(apiKey),
    signal: params.signal,
    tenantId: params.tenantId,
  });

  if (!apiKey) {
    const fallback = buildFallbackReply(params.transcript, plan);
    conversation.addAssistantMessage(fallback, { modulesUsed: plan.modules });
    return {
      sessionId: params.sessionId,
      reply: fallback,
      plan,
      modulesUsed: plan.modules,
      actions: [],
      source: "rules",
    };
  }

  const history = conversation.toAiHistory().slice(0, -1);
  const built = await buildVoiceMessages({
    tenantId: params.tenantId,
    userId: params.userId,
    userRole: params.userRole,
    transcript: params.transcript,
    plan,
    locale,
    history,
    apiKey,
  });
  const { messages, canUseTools, runtime, ragDocumentCount, startedAt, providerApiKey } = built;
  const llmKey = providerApiKey;

  const openaiBodyBase: Record<string, unknown> = {
    model: runtime.model,
    temperature: runtime.temperature,
    max_tokens: runtime.maxTokens,
    messages,
  };

  if (canUseTools) {
    openaiBodyBase.tools = RISTO_TOOLS;
    openaiBodyBase.tool_choice = "auto";
  }

  let fullReply = "";
  const actions: string[] = [];
  const toolsUsed: string[] = [];
  let totalUsage: { tokensIn: number; tokensOut: number } | null = null;

  if (canUseTools) {
    const first = await callLlmChatCompletion(runtime.provider, llmKey, openaiBodyBase, params.signal);
    totalUsage = usageFromOpenAi(first.usage, params.transcript, first.content ?? "");
    if (first.toolCalls.length > 0) {
      messages.push({
        role: "assistant",
        content: first.content,
        tool_calls: first.toolCalls,
      });

      for (const tc of first.toolCalls) {
        toolsUsed.push(tc.function.name);
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          /* empty */
        }
        const result = await executeRistoTool(tc.function.name, args, params.tenantId);
        actions.push(result.message);
        messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }

      const followUp = { ...openaiBodyBase, messages };
      delete (followUp as Record<string, unknown>).tools;
      delete (followUp as Record<string, unknown>).tool_choice;

      const streamed = await callLlmChatCompletion(runtime.provider, llmKey, followUp, params.signal);
      fullReply = streamed.content?.trim() || actions.join("\n\n");
      if (streamed.usage && totalUsage) {
        totalUsage = {
          tokensIn: totalUsage.tokensIn + streamed.usage.promptTokens,
          tokensOut: totalUsage.tokensOut + streamed.usage.completionTokens,
        };
      }
    } else {
      fullReply = first.content?.trim() ?? "";
    }
  }

  if (!fullReply) {
    const streamed = await callLlmChatCompletion(runtime.provider, llmKey, openaiBodyBase, params.signal);
    fullReply = streamed.content?.trim() ?? buildFallbackReply(params.transcript, plan);
    totalUsage = usageFromOpenAi(streamed.usage, params.transcript, fullReply);
  }

  conversation.addAssistantMessage(fullReply, { actions, modulesUsed: plan.modules });

  const tokens = totalUsage ?? usageFromOpenAi(null, params.transcript, fullReply);
  await logAiRequest({
    tenantId: params.tenantId,
    userId: params.userId,
    context: `voice:${plan.primaryContext}`,
    userMessage: params.transcript,
    assistantMessage: fullReply,
    telemetry: buildTelemetry({
      runtime,
      ...tokens,
      durationMs: Date.now() - startedAt,
      ragUsed: ragDocumentCount > 0,
      ragDocumentsCount: ragDocumentCount,
    }),
  });

  await recordMemoryExchange({
    tenantId: params.tenantId,
    userId: params.userId,
    channel: "voice",
    context: plan.primaryContext,
    userMessage: params.transcript,
    assistantMessage: fullReply,
    toolsUsed,
    metadata: { modulesUsed: plan.modules },
    locale,
    memoryEnabled: runtime.memoryEnabled,
  });

  return {
    sessionId: params.sessionId,
    reply: fullReply,
    plan,
    modulesUsed: plan.modules,
    actions,
    source: actions.length > 0 || plan.source === "rules+ai" ? "rules+ai" : "rules",
  };
}

function buildFallbackReply(transcript: string, plan: VoicePlan): string {
  return `Ho ricevuto: "${transcript}". Moduli consultati: ${plan.modules.join(", ")}. Configura OPENAI_API_KEY per risposte vocali complete.`;
}

export function runVoiceTurnStream(
  params: {
    tenantId: string;
    userId: string;
    userRole: string;
    sessionId: string;
    transcript: string;
    locale?: string;
  },
  reqSignal?: AbortSignal,
): Response {
  return createSseResponse(async (emit, signal) => {
    const conversation = VoiceConversation.resume(params.sessionId);
    if (!conversation) {
      emit({ type: "error", message: "Sessione voice non valida" });
      return;
    }

    const locale = params.locale ?? conversation.getSession()?.locale ?? "it";
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    conversation.addUserMessage(params.transcript);
    emit({ type: "status", message: "Voice Assistant: analisi richiesta…" });

    const plan = await planVoiceTurn(params.transcript, {
      locale,
      useAi: Boolean(apiKey),
      signal,
      tenantId: params.tenantId,
    });

    if (!apiKey) {
      const fallback = buildFallbackReply(params.transcript, plan);
      emit({ type: "token", content: fallback });
      conversation.addAssistantMessage(fallback, { modulesUsed: plan.modules });
      emit({ type: "done", reply: fallback, source: "rules" });
      return;
    }

    const history = conversation.toAiHistory().slice(0, -1);
    const built = await buildVoiceMessages({
      tenantId: params.tenantId,
      userId: params.userId,
      userRole: params.userRole,
      transcript: params.transcript,
      plan,
      locale,
      history,
      apiKey,
      emit,
    });
    const { messages, canUseTools, runtime, ragDocumentCount, startedAt, providerApiKey } = built;
  const llmKey = providerApiKey;

    const openaiBodyBase: Record<string, unknown> = {
      model: runtime.model,
      temperature: runtime.temperature,
      max_tokens: runtime.maxTokens,
      messages,
    };

    if (canUseTools) {
      openaiBodyBase.tools = RISTO_TOOLS;
      openaiBodyBase.tool_choice = "auto";
    }

    const actions: string[] = [];
    const toolsUsed: string[] = [];
    let fullReply = "";
    let usageAcc: { tokensIn: number; tokensOut: number } | null = null;

    if (canUseTools) {
      emit({ type: "status", message: "Eseguo azioni richieste…" });
      const first = await callLlmChatCompletion(runtime.provider, llmKey, openaiBodyBase, signal);
      usageAcc = usageFromOpenAi(first.usage, params.transcript, first.content ?? "");

      if (first.toolCalls.length > 0) {
        messages.push({
          role: "assistant",
          content: first.content,
          tool_calls: first.toolCalls,
        });

        for (const tc of first.toolCalls) {
          toolsUsed.push(tc.function.name);
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function.arguments);
          } catch {
            /* empty */
          }
          const result = await executeRistoTool(tc.function.name, args, params.tenantId);
          actions.push(result.message);
          messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
        }

        const followUp = { ...openaiBodyBase, messages };
        delete (followUp as Record<string, unknown>).tools;
        delete (followUp as Record<string, unknown>).tool_choice;

        emit({ type: "status", message: pickStatusMessage(plan.primaryContext, 3) });
        const streamed = await streamLlmChatCompletion(runtime.provider, llmKey,
          followUp,
          (token) => {
            fullReply += token;
            emit({ type: "token", content: token });
          },
          signal,
        );
        fullReply = streamed.content.trim() || actions.join("\n\n");
        if (streamed.usage && usageAcc) {
          usageAcc = {
            tokensIn: usageAcc.tokensIn + streamed.usage.promptTokens,
            tokensOut: usageAcc.tokensOut + streamed.usage.completionTokens,
          };
        }
        if (!streamed.content.trim() && actions.length) {
          emit({ type: "token", content: fullReply });
        }
      } else if (first.content) {
        fullReply = first.content;
        emit({ type: "token", content: fullReply });
      }
    }

    if (!fullReply) {
      emit({ type: "status", message: pickStatusMessage(plan.primaryContext, 3) });
      const streamed = await streamLlmChatCompletion(runtime.provider, llmKey,
        openaiBodyBase,
        (token) => {
          fullReply += token;
          emit({ type: "token", content: token });
        },
        signal,
      );
      fullReply = streamed.content.trim() || buildFallbackReply(params.transcript, plan);
      usageAcc = usageFromOpenAi(streamed.usage, params.transcript, fullReply);
      if (!streamed.content.trim()) emit({ type: "token", content: fullReply });
    }

    conversation.addAssistantMessage(fullReply, { actions, modulesUsed: plan.modules });

    const tokens = usageAcc ?? usageFromOpenAi(null, params.transcript, fullReply);
    await logAiRequest({
      tenantId: params.tenantId,
      userId: params.userId,
      context: `voice:${plan.primaryContext}`,
      userMessage: params.transcript,
      assistantMessage: fullReply,
      telemetry: buildTelemetry({
        runtime,
        ...tokens,
        durationMs: Date.now() - startedAt,
        ragUsed: ragDocumentCount > 0,
        ragDocumentsCount: ragDocumentCount,
      }),
    });

    await recordMemoryExchange({
      tenantId: params.tenantId,
      userId: params.userId,
      channel: "voice",
      context: plan.primaryContext,
      userMessage: params.transcript,
      assistantMessage: fullReply,
      toolsUsed,
      metadata: { modulesUsed: plan.modules },
      locale,
      memoryEnabled: runtime.memoryEnabled,
    });

    emit({
      type: "done",
      reply: fullReply,
      actions,
      source: "rules+ai",
      generatedAt: new Date().toISOString(),
    });
  }, reqSignal);
}

export { fetchModuleSnapshots, MODULE_SLUG };
