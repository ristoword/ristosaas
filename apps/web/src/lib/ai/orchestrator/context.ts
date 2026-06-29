import { retrieveKnowledgeContext } from "@/lib/ai/rag/retrieval";
import type { OrchestratorContext, OrchestratorRequest } from "@/lib/ai/orchestrator/types";
import { moduleToKnowledgeModules } from "@/lib/ai/rag/module-map";

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

  let ragContext: string | null = null;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (apiKey && params.request.query.trim()) {
    const modules = params.request.contextHint
      ? moduleToKnowledgeModules(params.request.contextHint)
      : undefined;
    ragContext = await retrieveKnowledgeContext(params.request.query, apiKey, {
      tenantId: params.tenantId,
      modules,
    });
  }

  return {
    tenantId: params.tenantId,
    userId: params.userId,
    locale,
    periodDays,
    ragContext,
    query: params.request.query.trim(),
  };
}

export function formatContextForPrompt(ctx: OrchestratorContext): string {
  const parts: string[] = [
    `Tenant: ${ctx.tenantId}`,
    `Periodo analisi: ${ctx.periodDays} giorni`,
    `Lingua risposta: ${ctx.locale}`,
  ];

  if (ctx.ragContext) {
    parts.push(ctx.ragContext);
  }

  return parts.join("\n\n");
}
