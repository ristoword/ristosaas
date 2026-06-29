import { estimateCostEur, estimateTokens } from "@/lib/ai/control-center/metrics";
import { aiChatRepository } from "@/lib/db/repositories/ai-chat.repository";
import type { AiRequestTelemetry, OpenAiUsage, ResolvedAgentRuntime } from "@/lib/ai/runtime/types";

export function usageFromOpenAi(usage?: OpenAiUsage | null, fallbackIn?: string, fallbackOut?: string): {
  tokensIn: number;
  tokensOut: number;
} {
  if (usage && (usage.promptTokens > 0 || usage.completionTokens > 0)) {
    return { tokensIn: usage.promptTokens, tokensOut: usage.completionTokens };
  }
  return {
    tokensIn: estimateTokens(fallbackIn ?? ""),
    tokensOut: estimateTokens(fallbackOut ?? ""),
  };
}

export function buildTelemetry(params: {
  runtime: Pick<ResolvedAgentRuntime, "agentId" | "agentSlug" | "model" | "provider">;
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
  ragUsed: boolean;
  ragDocumentsCount: number;
  webSearchUsed?: boolean;
  webSearchResultsCount?: number;
}): AiRequestTelemetry {
  return {
    agentId: params.runtime.agentId,
    agentSlug: params.runtime.agentSlug,
    model: params.runtime.model,
    provider: params.runtime.provider,
    tokensIn: params.tokensIn,
    tokensOut: params.tokensOut,
    costEur: estimateCostEur(params.tokensIn, params.tokensOut),
    durationMs: params.durationMs,
    ragUsed: params.ragUsed,
    ragDocumentsCount: params.ragDocumentsCount,
    webSearchUsed: params.webSearchUsed,
    webSearchResultsCount: params.webSearchResultsCount,
  };
}

export async function logAiRequest(params: {
  tenantId: string;
  userId: string;
  context: string;
  userMessage: string;
  assistantMessage?: string | null;
  errorMessage?: string | null;
  telemetry?: AiRequestTelemetry;
}) {
  return aiChatRepository.log({
    tenantId: params.tenantId,
    userId: params.userId,
    context: params.context,
    userMessage: params.userMessage,
    assistantMessage: params.assistantMessage,
    errorMessage: params.errorMessage,
    metadata: params.telemetry
      ? {
          agentId: params.telemetry.agentId,
          agentSlug: params.telemetry.agentSlug,
          model: params.telemetry.model,
          provider: params.telemetry.provider,
          tokensIn: params.telemetry.tokensIn,
          tokensOut: params.telemetry.tokensOut,
          costEur: params.telemetry.costEur,
          durationMs: params.telemetry.durationMs,
          ragUsed: params.telemetry.ragUsed,
          ragDocumentsCount: params.telemetry.ragDocumentsCount,
          webSearchUsed: params.telemetry.webSearchUsed,
          webSearchResultsCount: params.telemetry.webSearchResultsCount,
        }
      : undefined,
  });
}
