import { callLlmChatCompletion, resolveProviderApiKey } from "@/lib/ai/runtime/llm-provider";
import { conversationStore } from "@/lib/ai/memory/conversation-store";
import type { MemoryTurnRecord } from "@/lib/ai/memory/conversation-store";
import { resolveAgentRuntime } from "@/lib/ai/runtime/agent-resolver";

const MAX_SUMMARY_CHARS = 2000;
const MEMORY_CONTEXT = "general";

export function buildLocalSummary(existingSummary: string, turns: MemoryTurnRecord[]): string {
  const lines = turns.slice(0, 15).map((t) => {
    const user = t.userMessage.slice(0, 120);
    const assistant = (t.assistantMessage ?? "").slice(0, 120);
    return `- [${t.channel}/${t.context}] U: ${user}${assistant ? ` → A: ${assistant}` : ""}`;
  });

  const merged = [existingSummary.trim(), ...lines].filter(Boolean).join("\n");
  return merged.slice(-MAX_SUMMARY_CHARS);
}

export async function updateRollingSummary(params: {
  tenantId: string;
  userId: string;
  recentTurns: MemoryTurnRecord[];
  locale?: string;
}): Promise<string> {
  const profile = await conversationStore.getOrCreateProfile(params.tenantId, params.userId);

  if (params.recentTurns.length === 0) {
    const local = buildLocalSummary(profile.summary, params.recentTurns);
    await conversationStore.updateProfile(params.tenantId, params.userId, { summary: local });
    return local;
  }

  try {
    const runtime = await resolveAgentRuntime(params.tenantId, MEMORY_CONTEXT);
    if (!runtime.active) {
      const local = buildLocalSummary(profile.summary, params.recentTurns);
      await conversationStore.updateProfile(params.tenantId, params.userId, { summary: local });
      return local;
    }

    const apiKey = resolveProviderApiKey(runtime.provider);
    if (!apiKey) {
      const local = buildLocalSummary(profile.summary, params.recentTurns);
      await conversationStore.updateProfile(params.tenantId, params.userId, { summary: local });
      return local;
    }

    const lang = (params.locale ?? "it").startsWith("en") ? "English" : "italiano";
    const { content } = await callLlmChatCompletion(
      runtime.provider,
      apiKey,
      {
        model: runtime.model,
        temperature: Math.min(runtime.temperature, 0.2),
        max_tokens: Math.min(runtime.maxTokens, 400),
        messages: [
          {
            role: "system",
            content: `Comprimi la memoria conversazionale dell'utente in ${lang}. Max 1500 caratteri. Mantieni preferenze, topic ricorrenti, decisioni AI, tool usati.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              previousSummary: profile.summary,
              recentTurns: params.recentTurns.slice(0, 10).map((t) => ({
                channel: t.channel,
                context: t.context,
                user: t.userMessage.slice(0, 200),
                assistant: (t.assistantMessage ?? "").slice(0, 200),
                tools: t.toolsUsed,
              })),
            }).slice(0, 8000),
          },
        ],
      },
    );

    const summary = (content?.trim() || buildLocalSummary(profile.summary, params.recentTurns)).slice(
      0,
      MAX_SUMMARY_CHARS,
    );
    await conversationStore.updateProfile(params.tenantId, params.userId, { summary });
    return summary;
  } catch {
    const local = buildLocalSummary(profile.summary, params.recentTurns);
    await conversationStore.updateProfile(params.tenantId, params.userId, { summary: local });
    return local;
  }
}
