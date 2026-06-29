import { executeRistoTool } from "@/lib/ai/risto-tools";
import { pickStatusMessage } from "@/lib/ai/stream-status";
import { prepareBuiltChatContext, recordMemoryExchange } from "@/lib/ai/memory/context-manager";
import type { AiMessage, BuiltChatContext } from "@/lib/ai/chat-core";
import type { SseEmitter } from "@/lib/ai/sse";
import { callLlmChatCompletion, streamLlmChatCompletion } from "@/lib/ai/runtime/llm-provider";
import { buildTelemetry, logAiRequest, usageFromOpenAi } from "@/lib/ai/runtime/telemetry";
import type { OpenAiUsage } from "@/lib/ai/runtime/types";

export type StreamChatParams = {
  tenantId: string;
  userId: string;
  context: string;
  message: string;
  history: AiMessage[];
  enableTools?: boolean;
  locale?: string;
  userRole: string;
  apiKey: string;
};

async function persistChatResult(params: {
  built: BuiltChatContext;
  tenantId: string;
  userId: string;
  context: string;
  message: string;
  assistantMessage?: string | null;
  errorMessage?: string | null;
  locale?: string;
  toolsUsed?: string[];
  usage?: OpenAiUsage | null;
}) {
  const { built, usage, ...rest } = params;
  const tokens = usageFromOpenAi(usage, params.message, params.assistantMessage ?? "");
  const telemetry = buildTelemetry({
    runtime: built.runtime,
    tokensIn: tokens.tokensIn,
    tokensOut: tokens.tokensOut,
    durationMs: Date.now() - built.startedAt,
    ragUsed: built.rag.used,
    ragDocumentsCount: built.rag.documentCount,
    webSearchUsed: built.webSearch.used,
    webSearchResultsCount: built.webSearch.resultCount,
  });

  await logAiRequest({
    tenantId: rest.tenantId,
    userId: rest.userId,
    context: rest.context,
    userMessage: rest.message,
    assistantMessage: rest.assistantMessage,
    errorMessage: rest.errorMessage,
    telemetry,
  });

  if (rest.assistantMessage && !rest.errorMessage) {
    await recordMemoryExchange({
      tenantId: rest.tenantId,
      userId: rest.userId,
      channel: "chat",
      context: rest.context,
      userMessage: rest.message,
      assistantMessage: rest.assistantMessage,
      toolsUsed: rest.toolsUsed,
      locale: rest.locale,
      memoryEnabled: built.runtime.memoryEnabled,
    });
  }
}

export async function runAiChatStream(
  params: StreamChatParams,
  emit: SseEmitter,
  signal: AbortSignal,
): Promise<void> {
  const { tenantId, userId, context, message } = params;

  try {
    const built = await prepareBuiltChatContext({ ...params, emit });
    const llmKey = built.providerApiKey;

    if (!llmKey) {
      emit({ type: "error", message: "API key provider non configurata" });
      return;
    }

    if (!built.runtime.active) {
      emit({ type: "error", message: "Agente AI disattivato per questo tenant" });
      return;
    }

    if (!built.runtime.streamingEnabled) {
      emit({ type: "error", message: "Streaming disattivato per questo agente" });
      return;
    }

    if (built.canUseFunctions) {
      emit({ type: "status", message: pickStatusMessage("risto", 2) });
      const first = await callLlmChatCompletion(built.runtime.provider, llmKey, built.openaiBodyBase, signal);

      if (first.toolCalls.length > 0) {
        emit({ type: "status", message: "Eseguo le azioni richieste…" });
        const toolsUsed = first.toolCalls.map((tc) => tc.function.name);
        built.messages.push({
          role: "assistant",
          content: first.content,
          tool_calls: first.toolCalls,
        });

        const actionResults: string[] = [];
        for (const tc of first.toolCalls) {
          if (signal.aborted) throw new DOMException("Aborted", "AbortError");
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(tc.function.arguments); } catch { /* empty */ }
          const result = await executeRistoTool(tc.function.name, args, tenantId);
          actionResults.push(result.message);
          built.messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }

        emit({ type: "status", message: pickStatusMessage(context, 3) });
        const followUp: Record<string, unknown> = {
          ...built.openaiBodyBase,
          messages: built.messages,
        };
        delete followUp.tools;
        delete followUp.tool_choice;

        let fullReply = "";
        let usage = first.usage;
        try {
          const streamed = await streamLlmChatCompletion(
            built.runtime.provider,
            llmKey,
            followUp,
            (token) => {
              fullReply += token;
              emit({ type: "token", content: token });
            },
            signal,
          );
          fullReply = streamed.content.trim() || actionResults.join("\n\n");
          usage = streamed.usage ?? usage;
        } catch (streamErr) {
          if (signal.aborted) throw streamErr;
          fullReply = actionResults.join("\n\n");
          emit({ type: "token", content: fullReply });
        }

        await persistChatResult({
          built,
          tenantId,
          userId,
          context,
          message,
          assistantMessage: fullReply,
          locale: params.locale,
          toolsUsed,
          usage,
        });
        emit({ type: "done", reply: fullReply, actions: actionResults });
        return;
      }

      if (first.content) {
        emit({ type: "token", content: first.content });
        await persistChatResult({
          built,
          tenantId,
          userId,
          context,
          message,
          assistantMessage: first.content,
          locale: params.locale,
          usage: first.usage,
        });
        emit({ type: "done", reply: first.content });
        return;
      }
    }

    emit({ type: "status", message: pickStatusMessage(context, 3) });
    let fullReply = "";
    const streamed = await streamLlmChatCompletion(
      built.runtime.provider,
      llmKey,
      built.openaiBodyBase,
      (token) => {
        fullReply += token;
        emit({ type: "token", content: token });
      },
      signal,
    );
    fullReply = streamed.content.trim();

    if (!fullReply) {
      emit({ type: "error", message: "Risposta AI vuota" });
      await persistChatResult({
        built,
        tenantId,
        userId,
        context,
        message,
        errorMessage: "Risposta AI vuota",
        usage: streamed.usage,
      });
      return;
    }

    await persistChatResult({
      built,
      tenantId,
      userId,
      context,
      message,
      assistantMessage: fullReply,
      locale: params.locale,
      usage: streamed.usage,
    });
    emit({ type: "done", reply: fullReply });
  } catch (e) {
    if (signal.aborted) {
      emit({ type: "error", message: "Risposta interrotta" });
      return;
    }
    const msg = e instanceof Error ? e.message : "Errore sconosciuto";
    await logAiRequest({
      tenantId,
      userId,
      context,
      userMessage: message,
      errorMessage: msg,
    });
    emit({ type: "error", message: msg });
  }
}
