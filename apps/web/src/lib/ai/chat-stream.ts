import { aiChatRepository } from "@/lib/db/repositories/ai-chat.repository";
import { executeRistoTool } from "@/lib/ai/risto-tools";
import { buildChatContext } from "@/lib/ai/chat-core";
import { callOpenAIChatCompletion, streamOpenAIChatCompletion } from "@/lib/ai/openai-stream";
import { pickStatusMessage } from "@/lib/ai/stream-status";
import type { AiMessage } from "@/lib/ai/chat-core";
import type { SseEmitter } from "@/lib/ai/sse";

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

export async function runAiChatStream(
  params: StreamChatParams,
  emit: SseEmitter,
  signal: AbortSignal,
): Promise<void> {
  const { tenantId, userId, context, message, apiKey } = params;

  try {
    const built = await buildChatContext({ ...params, emit });

    if (built.canUseFunctions) {
      emit({ type: "status", message: pickStatusMessage("risto", 2) });
      const first = await callOpenAIChatCompletion(apiKey, built.openaiBodyBase, signal);

      if (first.toolCalls.length > 0) {
        emit({ type: "status", message: "Eseguo le azioni richieste…" });
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
        try {
          const streamed = await streamOpenAIChatCompletion(
            apiKey,
            followUp,
            (token) => {
              fullReply += token;
              emit({ type: "token", content: token });
            },
            signal,
          );
          fullReply = streamed.content.trim() || actionResults.join("\n\n");
        } catch (streamErr) {
          if (signal.aborted) throw streamErr;
          fullReply = actionResults.join("\n\n");
          emit({ type: "token", content: fullReply });
        }

        await aiChatRepository.log({
          tenantId,
          userId,
          context,
          userMessage: message,
          assistantMessage: fullReply,
        });
        emit({ type: "done", reply: fullReply, actions: actionResults });
        return;
      }

      if (first.content) {
        emit({ type: "token", content: first.content });
        await aiChatRepository.log({
          tenantId,
          userId,
          context,
          userMessage: message,
          assistantMessage: first.content,
        });
        emit({ type: "done", reply: first.content });
        return;
      }
    }

    emit({ type: "status", message: pickStatusMessage(context, 3) });
    let fullReply = "";
    const streamed = await streamOpenAIChatCompletion(
      apiKey,
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
      await aiChatRepository.log({
        tenantId,
        userId,
        context,
        userMessage: message,
        errorMessage: "Risposta AI vuota",
      });
      return;
    }

    await aiChatRepository.log({
      tenantId,
      userId,
      context,
      userMessage: message,
      assistantMessage: fullReply,
    });
    emit({ type: "done", reply: fullReply });
  } catch (e) {
    if (signal.aborted) {
      emit({ type: "error", message: "Risposta interrotta" });
      return;
    }
    const msg = e instanceof Error ? e.message : "Errore sconosciuto";
    await aiChatRepository.log({
      tenantId,
      userId,
      context,
      userMessage: message,
      errorMessage: msg,
    });
    emit({ type: "error", message: msg });
  }
}
