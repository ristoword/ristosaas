import type { MemoryTurnRecord } from "@/lib/ai/memory/conversation-store";
import { conversationStore } from "@/lib/ai/memory/conversation-store";

export type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export function turnsToHistoryMessages(turns: MemoryTurnRecord[]): HistoryMessage[] {
  const chronological = [...turns].reverse();
  const messages: HistoryMessage[] = [];

  for (const turn of chronological) {
    if (turn.userMessage.trim()) {
      messages.push({ role: "user", content: turn.userMessage.trim() });
    }
    if (turn.assistantMessage?.trim()) {
      messages.push({ role: "assistant", content: turn.assistantMessage.trim() });
    }
  }

  return messages;
}

export async function loadRecentHistory(
  tenantId: string,
  userId: string,
  limit = 12,
): Promise<HistoryMessage[]> {
  const turns = await conversationStore.listTurns(tenantId, userId, limit);
  return turnsToHistoryMessages(turns);
}

export function formatHistoryForPrompt(messages: HistoryMessage[], maxChars = 6000): string {
  if (messages.length === 0) return "";

  const lines: string[] = [];
  let total = 0;

  for (const msg of messages.slice(-20)) {
    const line = `${msg.role === "user" ? "Utente" : "Assistente"}: ${msg.content}`;
    if (total + line.length > maxChars) break;
    lines.push(line);
    total += line.length;
  }

  return lines.join("\n");
}

export function extractToolsFromTurns(turns: MemoryTurnRecord[]): string[] {
  const tools = new Set<string>();
  for (const turn of turns) {
    for (const t of turn.toolsUsed) tools.add(t);
  }
  return [...tools];
}

export function extractRecentDecisions(turns: MemoryTurnRecord[], limit = 5): unknown[] {
  const decisions: unknown[] = [];
  for (const turn of turns) {
    for (const d of turn.aiDecisions) {
      decisions.push(d);
      if (decisions.length >= limit) return decisions;
    }
  }
  return decisions;
}
