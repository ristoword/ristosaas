export { conversationStore } from "@/lib/ai/memory/conversation-store";
export type { MemoryChannel, MemoryTurnRecord, UserMemoryProfile } from "@/lib/ai/memory/conversation-store";
export { memoryVectorStore } from "@/lib/ai/memory/memory-vector-store";
export {
  loadRecentHistory,
  formatHistoryForPrompt,
  turnsToHistoryMessages,
  extractToolsFromTurns,
  extractRecentDecisions,
} from "@/lib/ai/memory/history";
export { updateRollingSummary, buildLocalSummary } from "@/lib/ai/memory/summary";
export { maybeCompressMemory, compressTextBlock, COMPRESS_AFTER_TURNS } from "@/lib/ai/memory/compression";
export {
  loadMemoryContext,
  recordMemoryExchange,
  augmentBuiltChatContext,
  augmentSystemPrompt,
  mergeClientHistory,
  prepareBuiltChatContext,
  isMemoryEnabled,
} from "@/lib/ai/memory/context-manager";
export type { MemoryContextInput, LoadedMemoryContext, RecordMemoryInput } from "@/lib/ai/memory/context-manager";
