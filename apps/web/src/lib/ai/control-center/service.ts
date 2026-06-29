import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { EMBEDDING_DIM } from "@/lib/ai/embeddings";
import { aiVectorRepository } from "@/lib/db/repositories/ai-vector.repository";
import { getAiPlatformConfig } from "@/lib/db/repositories/ai-platform-config.repository";
import {
  aiAgentRepository,
  aiControlAuditRepository,
  aiMarketplaceRepository,
  aiPromptRepository,
} from "@/lib/db/repositories/ai-control.repository";
import { aggregateChatMetrics, estimateCostEur, metricsFromLog } from "@/lib/ai/control-center/metrics";
import { resolveControlCenterPermissions } from "@/lib/ai/control-center/permissions";
import { ensureDefaultAgentsForTenant, PRECONFIGURED_AGENTS, seedAllTenantsAgents } from "@/lib/ai/control-center/seed-agents";
import type {
  AgentRow,
  AiEnterpriseControlPayload,
  AuditRow,
  BenchmarkSection,
  CostCenterSection,
  EmbeddingRow,
  ErrorCenterSection,
  MarketplaceRow,
  PromptTemplateRow,
  RouterTraceRow,
  UsageAnalyticsSection,
} from "@/lib/ai/control-center/types";
import type { PublicUser } from "@/lib/auth/types";

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1);
}

function classifyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("timeout")) return "timeout";
  if (m.includes("embedding")) return "embedding_error";
  if (m.includes("vector")) return "vector_error";
  if (m.includes("tool")) return "tool_error";
  if (m.includes("webhook")) return "webhook_error";
  if (m.includes("prompt")) return "prompt_error";
  if (m.includes("provider") || m.includes("openai") || m.includes("429")) return "provider_error";
  return "unknown";
}

async function buildAgentRows(tenantFilter?: string | null): Promise<AgentRow[]> {
  const agents = await aiAgentRepository.list(tenantFilter ?? undefined);
  const metrics = await aggregateChatMetrics({ tenantId: tenantFilter ?? undefined });

  const byAgentSlug = new Map<string, typeof metrics.logs>();
  for (const log of metrics.logs) {
    const m = metricsFromLog(log);
    const key = m.agentSlug ?? log.context;
    const list = byAgentSlug.get(key) ?? [];
    list.push(log);
    byAgentSlug.set(key, list);
  }

  return agents.map((a) => {
    const logs = byAgentSlug.get(a.slug) ?? byAgentSlug.get(a.module) ?? [];
    let tokens = 0;
    let cost = 0;
    let errors = 0;
    let durationTotal = 0;
    let durationCount = 0;
    let lastUsed: Date | null = null;
    for (const log of logs) {
      const m = metricsFromLog(log);
      tokens += m.tokensIn + m.tokensOut;
      cost += m.costEur;
      if (log.errorMessage) errors++;
      if (m.durationMs != null) {
        durationTotal += m.durationMs;
        durationCount++;
      }
      if (!lastUsed || log.createdAt > lastUsed) lastUsed = log.createdAt;
    }
    return {
      id: a.id,
      tenantId: a.tenantId,
      tenantName: a.tenant?.name,
      slug: a.slug,
      name: a.name,
      description: a.description,
      module: a.module,
      provider: a.provider,
      model: a.model,
      active: a.active,
      stats: {
        requestCount: logs.length,
        errorCount: errors,
        tokensEstimate: tokens,
        costEstimateEur: cost,
        avgResponseMs: durationCount > 0 ? durationTotal / durationCount : null,
        lastUsedAt: lastUsed?.toISOString() ?? null,
      },
      flags: {
        memoryEnabled: a.memoryEnabled,
        ragEnabled: a.ragEnabled,
        vectorEnabled: a.vectorEnabled,
        toolCallingEnabled: a.toolCallingEnabled,
        streamingEnabled: a.streamingEnabled,
        webSearchEnabled: a.webSearchEnabled,
        schedulerEnabled: a.schedulerEnabled,
      },
      updatedAt: a.updatedAt.toISOString(),
    };
  });
}

async function buildCosts(tenantFilter?: string | null): Promise<CostCenterSection> {
  const now = new Date();
  const [todayM, monthM, yearM, allM] = await Promise.all([
    aggregateChatMetrics({ tenantId: tenantFilter ?? undefined, since: startOfDay(now) }),
    aggregateChatMetrics({ tenantId: tenantFilter ?? undefined, since: startOfMonth(now) }),
    aggregateChatMetrics({ tenantId: tenantFilter ?? undefined, since: startOfYear(now) }),
    aggregateChatMetrics({ tenantId: tenantFilter ?? undefined }),
  ]);

  const config = await getAiPlatformConfig();
  const providerRows = [...allM.byProvider.entries()]
    .map(([provider, row]) => ({
      provider,
      eur: row.cost,
      tokens: row.tokens,
      requests: row.requests,
    }))
    .sort((a, b) => b.eur - a.eur);

  return {
    todayEur: todayM.totalCostEur,
    monthEur: monthM.totalCostEur,
    yearEur: yearM.totalCostEur,
    byTenant: [...allM.byTenant.entries()].map(([tenantId, row]) => ({
      tenantId,
      name: row.name,
      eur: row.cost,
      tokens: row.tokens,
    })),
    byAgent: [...allM.byAgent.entries()].map(([agentSlug, row]) => ({
      module: agentSlug,
      eur: row.cost,
      tokens: row.tokens,
      requests: row.requests,
    })),
    byProvider: providerRows.length > 0 ? providerRows : [{ provider: config.vectorProvider || "openai", eur: allM.totalCostEur, tokens: allM.tokensIn + allM.tokensOut, requests: allM.totalRequests }],
    tokensIn: allM.tokensIn,
    tokensOut: allM.tokensOut,
    avgTokens: allM.avgTokens,
  };
}

async function buildUsage(tenantFilter?: string | null): Promise<UsageAnalyticsSection> {
  const metrics = await aggregateChatMetrics({ tenantId: tenantFilter ?? undefined });
  const topAgents = [...metrics.byAgent.entries()]
    .map(([agentSlug, row]) => ({
      module: agentSlug,
      requests: row.requests,
      tokens: row.tokens,
      costEur: row.cost,
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 10);

  const topUsers = [...metrics.byUser.entries()]
    .map(([userId, requests]) => ({ userId, requests }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 10);

  const topModules = topAgents.map((a) => ({ module: a.module, requests: a.requests }));

  const trendDaily = [...metrics.byDay.entries()]
    .map(([date, row]) => ({ date, requests: row.requests, errors: row.errors }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  return {
    topAgents,
    topUsers,
    topModules,
    totalRequests: metrics.totalRequests,
    avgResponseMs: metrics.avgResponseMs,
    trendDaily,
  };
}

async function buildErrors(tenantFilter?: string | null): Promise<ErrorCenterSection> {
  const where: { tenantId?: string; errorMessage: { not: null } } = { errorMessage: { not: null } };
  if (tenantFilter) where.tenantId = tenantFilter;

  const logs = await prisma.aiChatLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      tenantId: true,
      context: true,
      errorMessage: true,
      createdAt: true,
    },
  });

  const byType = new Map<string, number>();
  for (const log of logs) {
    const type = classifyError(log.errorMessage ?? "");
    byType.set(type, (byType.get(type) ?? 0) + 1);
  }

  return {
    total: logs.length,
    byType: [...byType.entries()].map(([type, count]) => ({ type, count })),
    recent: logs.slice(0, 50).map((l) => ({
      id: l.id,
      type: classifyError(l.errorMessage ?? ""),
      message: l.errorMessage ?? "",
      tenantId: l.tenantId,
      context: l.context,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

async function buildRouter(tenantFilter?: string | null): Promise<RouterTraceRow[]> {
  const where = tenantFilter ? { tenantId: tenantFilter } : {};
  const logs = await prisma.aiChatLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      tenantId: true,
      userId: true,
      context: true,
      createdAt: true,
      userMessage: true,
      metadata: true,
    },
  });

  return logs.map((log) => {
    const m = metricsFromLog(log);
    const totalMs = m.durationMs ?? 0;
    const llmMs = totalMs > 0 ? Math.round(totalMs * 0.75) : 0;
    const ragMs = m.ragUsed ? Math.round(totalMs * 0.15) : 0;
    const routerMs = totalMs > 0 ? Math.max(5, totalMs - llmMs - ragMs) : 0;
    return {
      id: log.id,
      tenantId: log.tenantId,
      userId: log.userId,
      context: log.context,
      phases: {
        routerMs,
        ragMs,
        vectorMs: m.ragUsed ? Math.round(ragMs * 0.4) : 0,
        toolsMs: 0,
        llmMs,
        totalMs: totalMs || routerMs + ragMs + llmMs,
      },
      createdAt: log.createdAt.toISOString(),
    };
  });
}

async function buildEmbeddings(params: {
  tenantId?: string | null;
  search?: string;
  limit?: number;
}): Promise<{ rows: EmbeddingRow[]; total: number }> {
  const limit = params.limit ?? 100;
  const where: {
    tenantId?: string;
    OR?: Array<{ content?: { contains: string; mode: "insensitive" }; chunkKey?: { contains: string; mode: "insensitive" } }>;
  } = {};
  if (params.tenantId) where.tenantId = params.tenantId;
  if (params.search?.trim()) {
    where.OR = [
      { content: { contains: params.search.trim(), mode: "insensitive" } },
      { chunkKey: { contains: params.search.trim(), mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.aiVectorChunk.findMany({
      where,
      include: {
        tenant: { select: { name: true } },
        document: { select: { title: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    prisma.aiVectorChunk.count({ where }),
  ]);

  return {
    total,
    rows: rows.map((r) => ({
      id: r.id,
      chunkKey: r.chunkKey,
      tenantId: r.tenantId,
      tenantName: r.tenant?.name ?? null,
      documentId: r.documentId,
      documentTitle: r.document?.title ?? null,
      module: r.module,
      contentPreview: r.content.slice(0, 160),
      dimensions: EMBEDDING_DIM,
      provider: r.embeddingModel,
      updatedAt: r.updatedAt.toISOString(),
    })),
  };
}

async function buildBenchmark(tenantFilter?: string | null): Promise<BenchmarkSection> {
  const [vectorStats, metrics, knowledgeJobs, config] = await Promise.all([
    aiVectorRepository.getStats(),
    aggregateChatMetrics({ tenantId: tenantFilter ?? undefined }),
    prisma.aiKnowledgeIndexJob.findMany({
      where: tenantFilter ? { tenantId: tenantFilter } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getAiPlatformConfig(),
  ]);

  const jobOk = knowledgeJobs.filter((j) => j.status === "completed").length;
  const jobTotal = knowledgeJobs.length || 1;
  const errorRate = metrics.totalRequests ? metrics.errors / metrics.totalRequests : 0;

  let dbOk = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }

  const vectorOk = await aiVectorRepository.isAvailable();

  const ragHitRate = metrics.totalRequests > 0 ? metrics.ragHits / metrics.totalRequests : 0;
  const metadataCoverage = metrics.totalRequests > 0 ? metrics.metadataHits / metrics.totalRequests : 0;

  return {
    ragHitRate,
    cacheHitRate: metadataCoverage,
    embeddingSuccessRate: jobOk / jobTotal,
    toolSuccessRate: config.toolCallingEnabled ? Math.max(0, 1 - errorRate) : 0,
    streamingSuccessRate: config.streamingEnabled ? Math.max(0, 1 - errorRate * 0.5) : 0,
    avgLatencyMs: metrics.avgResponseMs ?? vectorStats.avgSearchMs,
    errorRate,
    dependencies: [
      { id: "openai", label: "OpenAI", status: process.env.OPENAI_API_KEY ? "green" : "red" },
      { id: "anthropic", label: "Anthropic", status: process.env.ANTHROPIC_API_KEY ? "green" : "yellow" },
      { id: "gemini", label: "Gemini", status: (process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY) ? "green" : "yellow" },
      { id: "vector", label: "Vector DB", status: vectorOk ? "green" : "yellow" },
      { id: "redis", label: "Redis", status: process.env.REDIS_URL ? "green" : "yellow" },
      { id: "database", label: "Database", status: dbOk ? "green" : "red" },
      { id: "realtime", label: "Realtime", status: config.streamingEnabled ? "green" : "yellow" },
    ],
  };
}

async function buildPrompts(tenantFilter?: string | null): Promise<PromptTemplateRow[]> {
  const rows = await aiPromptRepository.list(tenantFilter ?? undefined);
  return rows.map((p) => ({
    id: p.id,
    tenantId: p.tenantId,
    key: p.key,
    name: p.name,
    module: p.module,
    version: p.version,
    tags: Array.isArray(p.tags) ? (p.tags as string[]) : [],
    active: p.active,
    updatedAt: p.updatedAt.toISOString(),
  }));
}

async function buildMarketplace(tenantFilter?: string | null): Promise<MarketplaceRow[]> {
  const rows = await aiMarketplaceRepository.listWithInstalls(tenantFilter ?? undefined);
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    module: r.module,
    category: r.category,
    priceLabel: r.priceLabel,
    installed: r.installed,
    active: r.active,
  }));
}

async function buildAudit(tenantFilter?: string | null): Promise<AuditRow[]> {
  const rows = await aiControlAuditRepository.list({ tenantId: tenantFilter ?? undefined, limit: 80 });
  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    actorEmail: r.actorEmail,
    actorRole: r.actorRole,
    operation: r.operation,
    entityType: r.entityType,
    entityId: r.entityId,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function buildAiEnterpriseControlCenter(
  user: PublicUser,
  options?: { tenantId?: string | null; embeddingSearch?: string },
): Promise<AiEnterpriseControlPayload> {
  const permissions = resolveControlCenterPermissions(user);
  const isSuperAdmin = user.role === "super_admin";
  const tenantFilter = isSuperAdmin ? (options?.tenantId ?? null) : user.tenantId;

  if (isSuperAdmin && !tenantFilter) {
    await seedAllTenantsAgents();
  } else if (isSuperAdmin && tenantFilter) {
    await ensureDefaultAgentsForTenant(tenantFilter);
  } else if (!isSuperAdmin && user.tenantId) {
    await ensureDefaultAgentsForTenant(user.tenantId);
  }

  const [agents, prompts, embeddings, costs, usage, errors, router, marketplace, benchmark, audit] =
    await Promise.all([
      buildAgentRows(tenantFilter),
      buildPrompts(tenantFilter),
      buildEmbeddings({ tenantId: tenantFilter, search: options?.embeddingSearch }),
      buildCosts(tenantFilter),
      buildUsage(tenantFilter),
      buildErrors(tenantFilter),
      buildRouter(tenantFilter),
      buildMarketplace(tenantFilter),
      buildBenchmark(tenantFilter),
      buildAudit(tenantFilter),
    ]);

  return {
    permissions,
    agents,
    prompts,
    embeddings,
    costs,
    usage,
    errors,
    router,
    marketplace,
    benchmark,
    audit,
    preconfiguredCatalog: PRECONFIGURED_AGENTS.map((a) => ({ slug: a.slug, name: a.name, module: a.module })),
  };
}

export async function createAgent(
  user: PublicUser,
  data: {
    tenantId: string;
    slug: string;
    name: string;
    description?: string;
    module: string;
    provider?: string;
    model?: string;
    prompt?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    memoryEnabled?: boolean;
    ragEnabled?: boolean;
    vectorEnabled?: boolean;
    toolCallingEnabled?: boolean;
    streamingEnabled?: boolean;
    webSearchEnabled?: boolean;
    schedulerEnabled?: boolean;
    active?: boolean;
  },
  ip?: string,
) {
  const agent = await aiAgentRepository.create({
    id: randomUUID(),
    tenant: { connect: { id: data.tenantId } },
    slug: data.slug,
    name: data.name,
    description: data.description ?? "",
    module: data.module,
    provider: data.provider ?? "openai",
    model: data.model ?? "gpt-4o-mini",
    prompt: data.prompt ?? "",
    systemPrompt: data.systemPrompt ?? "",
    temperature: data.temperature ?? 0.4,
    maxTokens: data.maxTokens ?? 1200,
    memoryEnabled: data.memoryEnabled ?? true,
    ragEnabled: data.ragEnabled ?? true,
    vectorEnabled: data.vectorEnabled ?? true,
    toolCallingEnabled: data.toolCallingEnabled ?? true,
    streamingEnabled: data.streamingEnabled ?? true,
    webSearchEnabled: data.webSearchEnabled ?? false,
    schedulerEnabled: data.schedulerEnabled ?? false,
    active: data.active ?? true,
  });

  await aiControlAuditRepository.record({
    tenantId: data.tenantId,
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    agentId: agent.id,
    operation: "agent.create",
    entityType: "AiAgent",
    entityId: agent.id,
    newValue: agent,
    ipAddress: ip,
  });

  return agent;
}

export async function updateAgent(
  user: PublicUser,
  id: string,
  patch: Record<string, unknown>,
  ip?: string,
) {
  const before = await aiAgentRepository.getById(id);
  if (!before) throw new Error("Agente non trovato");

  const allowed = [
    "name", "description", "module", "provider", "model", "prompt", "systemPrompt",
    "temperature", "maxTokens", "memoryEnabled", "ragEnabled", "vectorEnabled",
    "toolCallingEnabled", "streamingEnabled", "webSearchEnabled", "schedulerEnabled", "active",
  ] as const;

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in patch) data[key] = patch[key];
  }

  const agent = await aiAgentRepository.update(id, data);
  await aiControlAuditRepository.record({
    tenantId: before.tenantId,
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    agentId: id,
    operation: "agent.update",
    entityType: "AiAgent",
    entityId: id,
    oldValue: before,
    newValue: agent,
    ipAddress: ip,
  });
  return agent;
}

export async function deleteAgent(user: PublicUser, id: string, ip?: string) {
  const before = await aiAgentRepository.getById(id);
  if (!before) throw new Error("Agente non trovato");
  await aiAgentRepository.delete(id);
  await aiControlAuditRepository.record({
    tenantId: before.tenantId,
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    agentId: id,
    operation: "agent.delete",
    entityType: "AiAgent",
    entityId: id,
    oldValue: before,
    ipAddress: ip,
  });
}

export async function deleteEmbedding(user: PublicUser, id: string, ip?: string) {
  const chunk = await prisma.aiVectorChunk.findUnique({ where: { id } });
  if (!chunk) throw new Error("Chunk non trovato");
  await prisma.aiVectorChunk.delete({ where: { id } });
  await aiControlAuditRepository.record({
    tenantId: chunk.tenantId,
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    operation: "embedding.delete",
    entityType: "AiVectorChunk",
    entityId: id,
    oldValue: { chunkKey: chunk.chunkKey, documentId: chunk.documentId },
    ipAddress: ip,
  });
}
