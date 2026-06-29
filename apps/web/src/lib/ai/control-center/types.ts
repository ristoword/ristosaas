/** AI Enterprise Control Center — shared DTO types. */

export type ControlCenterPermissions = {
  readOnly: boolean;
  canMutateAgents: boolean;
  canMutatePrompts: boolean;
  canMutateKnowledge: boolean;
  canMutateEmbeddings: boolean;
  canInstallMarketplace: boolean;
};

export type AgentStats = {
  requestCount: number;
  errorCount: number;
  tokensEstimate: number;
  costEstimateEur: number;
  avgResponseMs: number | null;
  lastUsedAt: string | null;
};

export type AgentRow = {
  id: string;
  tenantId: string;
  tenantName?: string;
  slug: string;
  name: string;
  description: string;
  module: string;
  provider: string;
  model: string;
  active: boolean;
  stats: AgentStats;
  flags: {
    memoryEnabled: boolean;
    ragEnabled: boolean;
    vectorEnabled: boolean;
    toolCallingEnabled: boolean;
    streamingEnabled: boolean;
    webSearchEnabled: boolean;
    schedulerEnabled: boolean;
  };
  updatedAt: string;
};

export type PromptTemplateRow = {
  id: string;
  tenantId: string | null;
  key: string;
  name: string;
  module: string;
  version: number;
  tags: string[];
  active: boolean;
  updatedAt: string;
};

export type EmbeddingRow = {
  id: string;
  chunkKey: string;
  tenantId: string | null;
  tenantName: string | null;
  documentId: string | null;
  documentTitle: string | null;
  module: string | null;
  contentPreview: string;
  dimensions: number;
  provider: string;
  updatedAt: string;
};

export type CostCenterSection = {
  todayEur: number;
  monthEur: number;
  yearEur: number;
  byTenant: Array<{ tenantId: string; name: string; eur: number; tokens: number }>;
  byAgent: Array<{ module: string; eur: number; tokens: number; requests: number }>;
  byProvider: Array<{ provider: string; eur: number; tokens: number }>;
  tokensIn: number;
  tokensOut: number;
  avgTokens: number;
};

export type UsageAnalyticsSection = {
  topAgents: Array<{ module: string; requests: number; tokens: number; costEur: number }>;
  topUsers: Array<{ userId: string; requests: number }>;
  topModules: Array<{ module: string; requests: number }>;
  totalRequests: number;
  avgResponseMs: number | null;
  trendDaily: Array<{ date: string; requests: number; errors: number }>;
};

export type ErrorCenterSection = {
  total: number;
  byType: Array<{ type: string; count: number }>;
  recent: Array<{
    id: string;
    type: string;
    message: string;
    tenantId: string | null;
    context: string;
    createdAt: string;
  }>;
};

export type RouterTraceRow = {
  id: string;
  tenantId: string;
  userId: string;
  context: string;
  phases: {
    routerMs: number;
    ragMs: number;
    vectorMs: number;
    toolsMs: number;
    llmMs: number;
    totalMs: number;
  };
  createdAt: string;
};

export type BenchmarkSection = {
  ragHitRate: number;
  cacheHitRate: number;
  embeddingSuccessRate: number;
  toolSuccessRate: number;
  streamingSuccessRate: number;
  avgLatencyMs: number | null;
  errorRate: number;
  dependencies: Array<{ id: string; label: string; status: string }>;
};

export type MarketplaceRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  module: string;
  category: string;
  priceLabel: string;
  installed: boolean;
  active: boolean;
};

export type AuditRow = {
  id: string;
  tenantId: string | null;
  actorEmail: string | null;
  actorRole: string;
  operation: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
};

export type AiEnterpriseControlPayload = {
  permissions: ControlCenterPermissions;
  agents: AgentRow[];
  prompts: PromptTemplateRow[];
  embeddings: { rows: EmbeddingRow[]; total: number };
  costs: CostCenterSection;
  usage: UsageAnalyticsSection;
  errors: ErrorCenterSection;
  router: RouterTraceRow[];
  marketplace: MarketplaceRow[];
  benchmark: BenchmarkSection;
  audit: AuditRow[];
  preconfiguredCatalog: Array<{ slug: string; name: string; module: string }>;
};
