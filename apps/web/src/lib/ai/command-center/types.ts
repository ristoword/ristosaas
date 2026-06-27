export type CommandCenterFilters = {
  module?: string;
  periodDays?: number;
  userId?: string;
  workflowId?: string;
  automationModule?: string;
};

export type AiStatusSection = {
  online: boolean;
  provider: string;
  model: string;
  streamingActive: boolean;
  ragActive: boolean;
  vectorDbActive: boolean;
  memoryActive: boolean;
  automationActive: boolean;
  schedulerActive: boolean;
  lastHeartbeat: string;
};

export type AiKpiSection = {
  workflowsRunning: number;
  decisionsToday: number;
  decisionsTotal: number;
  automationsCompleted: number;
  automationsFailed: number;
  workflowsPending: number;
  supervisorApprovals: number;
  avgResponseMs: number;
  avgOpenAiMs: number;
  costTodayEur: number;
  costMonthEur: number;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  openAiCalls: number;
  toolCalls: number;
  ragSearches: number;
  documentsConsulted: number;
};

export type AiSavingsSection = {
  hoursSaved: number;
  timeSavedMinutes: number;
  automaticOrders: number;
  proposalsApproved: number;
  foodCostOptimized: number;
  wasteAvoidedKg: number;
  automaticReorders: number;
  estimatedRevenueEur: number;
  estimatedSavingsEur: number;
};

export type AiTimelineEvent = {
  id: string;
  at: string;
  level: "success" | "warning" | "error" | "info";
  message: string;
  module?: string;
};

export type AiWorkflowLive = {
  id: string;
  status: string;
  module: string;
  userId: string;
  tenantId: string;
  startedAt: string;
  elapsedMs: number;
  currentStep: string;
  progressPct: number;
};

export type AiAutomationRow = {
  module: string;
  enabled: boolean;
  level: number;
  triggers: string[];
  lastRunAt: string | null;
  nextRunEstimate: string | null;
  avgDurationMs: number;
  lastOutcome: string | null;
};

export type AiDecisionRow = {
  id: string;
  module: string;
  decision: string;
  motivation: string;
  confidence: number | null;
  dataSources: string[];
  ruleBased: boolean;
  openAi: boolean;
  rag: boolean;
  status: string;
  createdAt: string;
};

export type HealthCheck = {
  id: string;
  label: string;
  status: "green" | "yellow" | "red";
  detail: string;
};

export type ChartPoint = { date: string; value: number };

export type AiStatsSection = {
  decisions: ChartPoint[];
  tokens: ChartPoint[];
  costs: ChartPoint[];
  workflows: ChartPoint[];
  automations: ChartPoint[];
  savings: ChartPoint[];
  errors: ChartPoint[];
};

export type AiLogRow = {
  id: string;
  at: string;
  level: string;
  module: string;
  message: string;
  userId?: string;
};

export type CommandCenterDashboard = {
  generatedAt: string;
  tenantId: string;
  filters: CommandCenterFilters;
  status: AiStatusSection;
  kpis: AiKpiSection;
  savings: AiSavingsSection;
  timeline: AiTimelineEvent[];
  workflowsLive: AiWorkflowLive[];
  automations: AiAutomationRow[];
  decisions: AiDecisionRow[];
  health: HealthCheck[];
  stats: AiStatsSection;
  logs: AiLogRow[];
};
