import { prisma } from "@/lib/db/prisma";
import type { AiChatLogMetadata } from "@/lib/db/repositories/ai-chat.repository";

const INPUT_COST_PER_1M = Number(process.env.AI_COST_INPUT_PER_1M_EUR || 0.14);
const OUTPUT_COST_PER_1M = Number(process.env.AI_COST_OUTPUT_PER_1M_EUR || 0.56);

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateCostEur(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * INPUT_COST_PER_1M + (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M;
}

type LogRow = {
  id: string;
  tenantId: string;
  userId: string;
  context: string;
  userMessage: string;
  assistantMessage: string | null;
  errorMessage: string | null;
  createdAt: Date;
  metadata: unknown;
};

export function metricsFromLog(log: { userMessage: string; assistantMessage?: string | null; metadata: unknown }) {
  const md = (log.metadata ?? {}) as AiChatLogMetadata;
  if (typeof md.tokensIn === "number" && typeof md.tokensOut === "number") {
    return {
      tokensIn: md.tokensIn,
      tokensOut: md.tokensOut,
      costEur: typeof md.costEur === "number" ? md.costEur : estimateCostEur(md.tokensIn, md.tokensOut),
      durationMs: typeof md.durationMs === "number" ? md.durationMs : null,
      provider: md.provider,
      agentSlug: md.agentSlug,
      agentId: md.agentId,
      ragUsed: md.ragUsed === true,
      webSearchUsed: md.webSearchUsed === true,
      fromMetadata: true,
    };
  }

  const tokensIn = estimateTokens(log.userMessage);
  const tokensOut = estimateTokens(log.assistantMessage ?? "");
  return {
    tokensIn,
    tokensOut,
    costEur: estimateCostEur(tokensIn, tokensOut),
    durationMs: null,
    provider: undefined,
    agentSlug: undefined,
    agentId: undefined,
    ragUsed: false,
    webSearchUsed: false,
    fromMetadata: false,
  };
}

export async function aggregateChatMetrics(params: {
  tenantId?: string | null;
  since?: Date;
  groupByContext?: boolean;
}) {
  const where: { tenantId?: string; createdAt?: { gte: Date } } = {};
  if (params.tenantId) where.tenantId = params.tenantId;
  if (params.since) where.createdAt = { gte: params.since };

  const logs = await prisma.aiChatLog.findMany({
    where,
    select: {
      id: true,
      tenantId: true,
      userId: true,
      context: true,
      userMessage: true,
      assistantMessage: true,
      errorMessage: true,
      createdAt: true,
      metadata: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  let tokensIn = 0;
  let tokensOut = 0;
  let errors = 0;
  let metadataHits = 0;
  let ragHits = 0;
  let webSearchHits = 0;
  let durationTotalMs = 0;
  let durationCount = 0;

  const byContext = new Map<string, { requests: number; tokens: number; cost: number; errors: number }>();
  const byAgent = new Map<string, { requests: number; tokens: number; cost: number; errors: number; agentSlug: string }>();
  const byProvider = new Map<string, { requests: number; tokens: number; cost: number }>();
  const byUser = new Map<string, number>();
  const byDay = new Map<string, { requests: number; errors: number }>();
  const byTenant = new Map<string, { name: string; tokens: number; cost: number }>();

  for (const log of logs) {
    const m = metricsFromLog(log);
    tokensIn += m.tokensIn;
    tokensOut += m.tokensOut;
    if (m.fromMetadata) metadataHits++;
    if (m.ragUsed) ragHits++;
    if (m.webSearchUsed) webSearchHits++;
    if (m.durationMs != null) {
      durationTotalMs += m.durationMs;
      durationCount++;
    }
    if (log.errorMessage) errors++;

    const ctx = log.context || "default";
    const ctxRow = byContext.get(ctx) ?? { requests: 0, tokens: 0, cost: 0, errors: 0 };
    ctxRow.requests++;
    ctxRow.tokens += m.tokensIn + m.tokensOut;
    ctxRow.cost += m.costEur;
    if (log.errorMessage) ctxRow.errors++;
    byContext.set(ctx, ctxRow);

    const agentKey = m.agentSlug ?? ctx;
    const agentRow = byAgent.get(agentKey) ?? { requests: 0, tokens: 0, cost: 0, errors: 0, agentSlug: agentKey };
    agentRow.requests++;
    agentRow.tokens += m.tokensIn + m.tokensOut;
    agentRow.cost += m.costEur;
    if (log.errorMessage) agentRow.errors++;
    byAgent.set(agentKey, agentRow);

    const providerKey = m.provider ?? "unknown";
    const providerRow = byProvider.get(providerKey) ?? { requests: 0, tokens: 0, cost: 0 };
    providerRow.requests++;
    providerRow.tokens += m.tokensIn + m.tokensOut;
    providerRow.cost += m.costEur;
    byProvider.set(providerKey, providerRow);

    byUser.set(log.userId, (byUser.get(log.userId) ?? 0) + 1);

    const day = log.createdAt.toISOString().slice(0, 10);
    const dayRow = byDay.get(day) ?? { requests: 0, errors: 0 };
    dayRow.requests++;
    if (log.errorMessage) dayRow.errors++;
    byDay.set(day, dayRow);

    const tRow = byTenant.get(log.tenantId) ?? { name: log.tenantId, tokens: 0, cost: 0 };
    tRow.tokens += m.tokensIn + m.tokensOut;
    tRow.cost += m.costEur;
    byTenant.set(log.tenantId, tRow);
  }

  if (byTenant.size > 0) {
    const tenants = await prisma.tenant.findMany({
      where: { id: { in: [...byTenant.keys()] } },
      select: { id: true, name: true },
    });
    for (const t of tenants) {
      const row = byTenant.get(t.id);
      if (row) row.name = t.name;
    }
  }

  return {
    logs,
    tokensIn,
    tokensOut,
    errors,
    totalRequests: logs.length,
    metadataHits,
    ragHits,
    webSearchHits,
    avgResponseMs: durationCount > 0 ? durationTotalMs / durationCount : null,
    byContext,
    byAgent,
    byProvider,
    byUser,
    byDay,
    byTenant,
    avgTokens: logs.length ? (tokensIn + tokensOut) / logs.length : 0,
    totalCostEur: estimateCostEur(tokensIn, tokensOut),
  };
}
