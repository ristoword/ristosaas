/** Resolved agent configuration for a single AI request (DB + platform toggles). */

export type ResolvedAgentRuntime = {
  agentId: string | null;
  agentSlug: string;
  agentName: string;
  tenantId: string;
  module: string;
  provider: string;
  model: string;
  prompt: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  memoryEnabled: boolean;
  ragEnabled: boolean;
  vectorEnabled: boolean;
  toolCallingEnabled: boolean;
  streamingEnabled: boolean;
  webSearchEnabled: boolean;
  schedulerEnabled: boolean;
  active: boolean;
};

export type RagContextResult = {
  context: string | null;
  documentCount: number;
  used: boolean;
};

export type WebSearchContextResult = {
  context: string | null;
  resultCount: number;
  used: boolean;
};

export type AiRequestTelemetry = {
  agentId: string | null;
  agentSlug: string;
  model: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  costEur: number;
  durationMs: number;
  ragUsed: boolean;
  ragDocumentsCount: number;
  webSearchUsed?: boolean;
  webSearchResultsCount?: number;
};

export type OpenAiUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};
