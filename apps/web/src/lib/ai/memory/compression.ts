import { conversationStore } from "@/lib/ai/memory/conversation-store";
import { updateRollingSummary } from "@/lib/ai/memory/summary";

export const COMPRESS_AFTER_TURNS = 60;
export const KEEP_RECENT_TURNS = 30;

export async function maybeCompressMemory(params: {
  tenantId: string;
  userId: string;
  locale?: string;
}): Promise<{ compressed: boolean; deletedCount: number }> {
  const total = await conversationStore.countTurns(params.tenantId, params.userId);
  if (total <= COMPRESS_AFTER_TURNS) {
    return { compressed: false, deletedCount: 0 };
  }

  const turns = await conversationStore.listTurns(params.tenantId, params.userId, COMPRESS_AFTER_TURNS);
  const toSummarize = turns.slice(KEEP_RECENT_TURNS);

  if (toSummarize.length === 0) {
    return { compressed: false, deletedCount: 0 };
  }

  await updateRollingSummary({
    tenantId: params.tenantId,
    userId: params.userId,
    recentTurns: toSummarize,
    locale: params.locale,
  });

  const oldestKept = turns[KEEP_RECENT_TURNS - 1];
  if (!oldestKept) return { compressed: false, deletedCount: 0 };

  const deletedCount = await conversationStore.deleteTurnsBefore(
    params.tenantId,
    params.userId,
    new Date(oldestKept.createdAt),
  );

  return { compressed: true, deletedCount };
}

export function compressTextBlock(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 20)}\n… [compresso]`;
}
