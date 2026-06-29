import { embedText } from "@/lib/ai/embeddings";
import { buildChatContext, type BuiltChatContext, type BuildChatContextParams } from "@/lib/ai/chat-core";
import { maybeCompressMemory } from "@/lib/ai/memory/compression";
import { conversationStore, type MemoryChannel } from "@/lib/ai/memory/conversation-store";
import {
  extractRecentDecisions,
  extractToolsFromTurns,
  formatHistoryForPrompt,
  turnsToHistoryMessages,
} from "@/lib/ai/memory/history";
import { memoryVectorStore } from "@/lib/ai/memory/memory-vector-store";
import { isMemoryEnabledSync } from "@/lib/ai/platform-config.runtime";

export type MemoryContextInput = {
  tenantId: string;
  userId: string;
  query: string;
  context: string;
  channel?: MemoryChannel;
  locale?: string;
};

export type LoadedMemoryContext = {
  promptBlock: string;
  profile: Awaited<ReturnType<typeof conversationStore.getOrCreateProfile>>;
  vectorHits: number;
  historyTurns: number;
};

export type RecordMemoryInput = {
  tenantId: string;
  userId: string;
  channel: MemoryChannel;
  context: string;
  userMessage: string;
  assistantMessage?: string | null;
  toolsUsed?: string[];
  aiDecisions?: unknown[];
  metadata?: Record<string, unknown>;
  locale?: string;
};

function isMemoryEnabled(): boolean {
  return isMemoryEnabledSync();
}

export async function loadMemoryContext(input: MemoryContextInput): Promise<LoadedMemoryContext | null> {
  if (!isMemoryEnabled()) return null;

  try {
    const profile = await conversationStore.getOrCreateProfile(input.tenantId, input.userId);
    const turns = await conversationStore.listTurns(input.tenantId, input.userId, 15);
    const historyMessages = formatHistoryForPrompt(turnsToHistoryMessages(turns));

    const toolsUsed = extractToolsFromTurns(turns);
    const decisions = extractRecentDecisions(turns);

    let vectorSection = "";
    let vectorHits = 0;
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (apiKey && input.query.trim()) {
      try {
        const queryEmbedding = await embedText(apiKey, input.query);
        const hits = await memoryVectorStore.search({
          tenantId: input.tenantId,
          userId: input.userId,
          queryEmbedding,
          topK: 4,
        });
        vectorHits = hits.length;
        if (hits.length > 0) {
          vectorSection = hits.map((h) => h.content).join("\n---\n");
        }
      } catch {
        /* non-blocking */
      }
    }

    const prefs =
      Object.keys(profile.preferences).length > 0
        ? JSON.stringify(profile.preferences).slice(0, 800)
        : "";

    const promptBlock = [
      "=== MEMORIA CONVERSAZIONALE PERSISTENTE (tenant + utente) ===",
      profile.summary ? `Riassunto: ${profile.summary}` : "",
      profile.lastContext ? `Ultimo contesto: ${profile.lastContext}` : "",
      prefs ? `Preferenze: ${prefs}` : "",
      toolsUsed.length ? `Tool usati di recente: ${toolsUsed.join(", ")}` : "",
      decisions.length ? `Decisioni AI recenti: ${JSON.stringify(decisions).slice(0, 1200)}` : "",
      historyMessages ? `Cronologia recente:\n${historyMessages}` : "",
      vectorSection ? `Memoria semantica (vector/RAG utente):\n${vectorSection}` : "",
      "Usa questa memoria per continuità. Non contraddire dati operativi live del tenant.",
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      promptBlock,
      profile,
      vectorHits,
      historyTurns: turns.length,
    };
  } catch {
    return null;
  }
}

export async function recordMemoryExchange(input: RecordMemoryInput): Promise<void> {
  if (!isMemoryEnabled()) return;

  try {
    const turn = await conversationStore.appendTurn({
      tenantId: input.tenantId,
      userId: input.userId,
      channel: input.channel,
      context: input.context,
      userMessage: input.userMessage,
      assistantMessage: input.assistantMessage,
      toolsUsed: input.toolsUsed,
      aiDecisions: input.aiDecisions,
      metadata: input.metadata,
    });

    await conversationStore.updateProfile(input.tenantId, input.userId, {
      lastContext: input.context,
    });

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const embedContent = [
      input.userMessage,
      input.assistantMessage ?? "",
      input.toolsUsed?.length ? `Tools: ${input.toolsUsed.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (apiKey && embedContent.trim()) {
      await memoryVectorStore
        .upsertTurnEmbedding({
          tenantId: input.tenantId,
          userId: input.userId,
          turnId: turn.id,
          content: embedContent,
          apiKey,
        })
        .catch(() => undefined);
    }

    await maybeCompressMemory({
      tenantId: input.tenantId,
      userId: input.userId,
      locale: input.locale,
    });
  } catch {
    /* non-blocking persistence */
  }
}

/** Inietta memoria persistente nel system prompt (non modifica chat UI). */
export async function augmentBuiltChatContext(
  built: BuiltChatContext,
  input: MemoryContextInput,
): Promise<BuiltChatContext> {
  const memory = await loadMemoryContext(input);
  if (!memory?.promptBlock) return built;

  const messages = [...built.messages];
  const systemIdx = messages.findIndex((m) => m.role === "system");
  if (systemIdx >= 0) {
    messages[systemIdx] = {
      ...messages[systemIdx],
      content: `${messages[systemIdx].content ?? ""}\n\n${memory.promptBlock}`,
    };
  } else {
    messages.unshift({ role: "system", content: memory.promptBlock });
  }

  return {
    ...built,
    messages,
    openaiBodyBase: {
      ...built.openaiBodyBase,
      messages,
    },
  };
}

/** Carica cronologia persistente se la richiesta non include history client. */
export async function mergeClientHistory(
  tenantId: string,
  userId: string,
  clientHistory: Array<{ role: string; content: string }>,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  if (clientHistory.length > 0) {
    return clientHistory
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  }
  const { loadRecentHistory } = await import("@/lib/ai/memory/history");
  return loadRecentHistory(tenantId, userId, 12);
}

export async function prepareBuiltChatContext(
  params: BuildChatContextParams & { userId: string; channel?: MemoryChannel },
): Promise<BuiltChatContext> {
  const built = await buildChatContext(params);
  return augmentBuiltChatContext(built, {
    tenantId: params.tenantId,
    userId: params.userId,
    query: params.message,
    context: params.context,
    channel: params.channel ?? "chat",
    locale: params.locale,
  });
}

export async function augmentSystemPrompt(
  systemPrompt: string,
  input: MemoryContextInput,
): Promise<string> {
  const memory = await loadMemoryContext(input);
  if (!memory?.promptBlock) return systemPrompt;
  return `${systemPrompt}\n\n${memory.promptBlock}`;
}

export { isMemoryEnabled };
