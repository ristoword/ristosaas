import { resolveAgentWithPrompts } from "@/lib/ai/runtime/agent-resolver";
import { retrieveAgentRagContext } from "@/lib/ai/runtime/rag-context";
import { retrieveWebSearchContext } from "@/lib/ai/runtime/web-search";
import { resolveProviderApiKey } from "@/lib/ai/runtime/llm-provider";
import type { OrchestratorContext, OrchestratorRequest } from "@/lib/ai/orchestrator/types";

export async function buildOrchestratorContext(params: {
  tenantId: string;
  userId?: string;
  request: OrchestratorRequest;
}): Promise<OrchestratorContext> {
  const locale = params.request.locale ?? "it";
  const periodDaysRaw = Number(params.request.periodDays ?? 14);
  const periodDays = Number.isFinite(periodDaysRaw)
    ? Math.min(60, Math.max(1, Math.floor(periodDaysRaw)))
    : 14;

  const routerContext = params.request.contextHint ?? "dashboard";
  const { runtime } = await resolveAgentWithPrompts(params.tenantId, routerContext);

  let ragContext: string | null = null;
  let ragDocumentCount = 0;
  let webSearchContext: string | null = null;
  let webSearchResultCount = 0;

  const apiKey = resolveProviderApiKey(runtime.provider);
  if (params.request.query.trim()) {
    if (apiKey) {
      const rag = await retrieveAgentRagContext({
        query: params.request.query,
        apiKey,
        tenantId: params.tenantId,
        module: runtime.module,
        ragEnabled: runtime.ragEnabled,
        vectorEnabled: runtime.vectorEnabled,
      });
      ragContext = rag.context;
      ragDocumentCount = rag.documentCount;
    }

    const webSearch = await retrieveWebSearchContext({
      query: params.request.query,
      webSearchEnabled: runtime.webSearchEnabled,
    });
    webSearchContext = webSearch.context;
    webSearchResultCount = webSearch.resultCount;
  }

  return {
    tenantId: params.tenantId,
    userId: params.userId,
    locale,
    periodDays,
    ragContext,
    ragDocumentCount,
    webSearchContext,
    webSearchResultCount,
    query: params.request.query.trim(),
    agentSlug: runtime.agentSlug,
    routerContext,
  };
}

export function formatContextForPrompt(ctx: OrchestratorContext): string {
  const parts: string[] = [
    `Tenant: ${ctx.tenantId}`,
    `Periodo analisi: ${ctx.periodDays} giorni`,
    `Lingua risposta: ${ctx.locale}`,
  ];

  if (ctx.webSearchContext) parts.push(ctx.webSearchContext);
  if (ctx.ragContext) parts.push(ctx.ragContext);

  return parts.join("\n\n");
}
