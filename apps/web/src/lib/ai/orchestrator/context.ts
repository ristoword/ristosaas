import { retrieveManualContext } from "@/lib/ai/rag";
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

  let ragContext: string | null = null;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (apiKey && params.request.query.trim()) {
    ragContext = await retrieveManualContext(params.request.query, apiKey);
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
