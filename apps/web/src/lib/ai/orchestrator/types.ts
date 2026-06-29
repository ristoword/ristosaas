import type { ModuleId } from "@/lib/ai/modules/types";

/** Moduli gestiti dall'orchestratore centrale (subset operativo). */
export const ORCHESTRATOR_MODULE_IDS = [
  "sala",
  "kitchen",
  "foodcost",
  "inventory",
  "cantina",
  "bar",
  "pizzeria",
  "crm",
  "hotel",
  "reception",
  "housekeeping",
  "prenotazioni",
  "catering",
  "dashboard",
  "supervisor",
  "staff",
  "turni",
  "haccp",
  "hardware",
] as const;

export type OrchestratorModuleId = (typeof ORCHESTRATOR_MODULE_IDS)[number];

export type OrchestratorRequest = {
  query: string;
  locale?: string;
  periodDays?: number;
  enrich?: boolean;
  /** Hint opzionale dal contesto UI (es. "cucina", "supervisor") */
  contextHint?: string;
  stream?: boolean;
};

export type OrchestratorPlan = {
  modules: OrchestratorModuleId[];
  reasoning: string;
  source: "rules" | "rules+ai";
};

export type OrchestratorModuleResult = {
  module: OrchestratorModuleId;
  moduleId: ModuleId;
  snapshot: unknown;
  insights: string | null;
  source: "rules" | "rules+ai";
  error?: string;
};

export type OrchestratorContext = {
  tenantId: string;
  userId?: string;
  locale: string;
  periodDays: number;
  ragContext: string | null;
  ragDocumentCount?: number;
  webSearchContext?: string | null;
  webSearchResultCount?: number;
  query: string;
  agentSlug?: string;
  routerContext?: string;
};

export type OrchestratorResponse = {
  reply: string;
  generatedAt: string;
  plan: OrchestratorPlan;
  modules: OrchestratorModuleResult[];
  ragUsed: boolean;
  source: "rules" | "rules+ai";
};

export type OrchestratorRunOptions = {
  tenantId: string;
  userId?: string;
  request: OrchestratorRequest;
  signal?: AbortSignal;
};
