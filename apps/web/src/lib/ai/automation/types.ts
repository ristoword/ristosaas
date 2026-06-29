import type { AiDecisionDomain } from "@/lib/ai/decisions/types";

/** Trigger operativi monitorabili (configurabili per tenant). */
export const AUTOMATION_TRIGGERS = [
  "prodotto_sotto_scorta",
  "prodotto_in_scadenza",
  "food_cost_sopra_target",
  "beverage_cost_sopra_target",
  "margine_sotto_soglia",
  "personale_insufficiente",
  "overstaffing",
  "prenotazioni_elevate",
  "occupazione_hotel_elevata",
  "haccp_non_conforme",
  "temperatura_fuori_limite",
  "camera_pronta",
  "camera_in_ritardo",
  "pagamento_in_scadenza",
  "licenza_saas_in_scadenza",
  "manutenzione_hardware",
  "evento_calendario",
  "previsione_meteo_critica",
] as const;

export type AutomationTriggerType = (typeof AUTOMATION_TRIGGERS)[number];

/** Moduli workflow supportati. */
export const AUTOMATION_MODULES = [
  "magazzino",
  "food_cost",
  "cantina",
  "crm",
  "prenotazioni",
  "hotel",
  "housekeeping",
  "room_service",
  "staff",
  "turni",
  "haccp",
  "catering",
  "sala",
  "cassa",
  "dashboard",
  "owner",
  "supervisor",
  "hardware",
  "licenze",
] as const;

export type AutomationModule = (typeof AUTOMATION_MODULES)[number];

/** Livello 1 = suggerimento, 2 = approvazione, 3 = esecuzione automatica. */
export type AutomationLevel = 1 | 2 | 3;

export type AutomationRunStatus =
  | "pending"
  | "awaiting_approval"
  | "running"
  | "completed"
  | "failed"
  | "rolled_back"
  | "skipped";

export type TriggerEvaluation = {
  trigger: AutomationTriggerType;
  module: AutomationModule;
  fired: boolean;
  severity: "info" | "warning" | "critical";
  summary: string;
  context: Record<string, unknown>;
  dataUsed: string[];
};

export type WorkflowStepType = "analyze" | "propose" | "execute" | "notify" | "audit";

export type WorkflowStep = {
  type: WorkflowStepType;
  label: string;
  optional?: boolean;
};

export type WorkflowDefinition = {
  id: string;
  module: AutomationModule;
  triggers: AutomationTriggerType[];
  decisionDomain?: AiDecisionDomain;
  steps: WorkflowStep[];
  defaultLevel: AutomationLevel;
  notifyRoles: string[];
};

export type AutomationConfig = {
  tenantId: string;
  module: AutomationModule;
  role: string | null;
  level: AutomationLevel;
  enabled: boolean;
  triggers: Partial<Record<AutomationTriggerType, boolean>>;
  conditions: Record<string, unknown>;
  updatedAt: string;
};

export type AutomationRunRecord = {
  id: string;
  tenantId: string;
  workflowId: string;
  module: AutomationModule;
  triggerType: AutomationTriggerType;
  status: AutomationRunStatus;
  level: AutomationLevel;
  idempotencyKey: string;
  context: Record<string, unknown>;
  dataUsed: string[];
  aiReasoning: string | null;
  confidence: number | null;
  motivation: string | null;
  proposalId: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  executedActions: unknown[];
  rollbackPayload: unknown | null;
  errorMessage: string | null;
  triggeredBy: string;
  startedAt: string;
  finishedAt: string | null;
};

export type AutomationAuditEntry = {
  id: string;
  runId: string;
  tenantId: string;
  event: string;
  payload: Record<string, unknown>;
  userId: string | null;
  createdAt: string;
};

export type ActionExecutionResult = {
  actionType: string;
  success: boolean;
  message: string;
  data?: unknown;
  rollback?: Record<string, unknown>;
};

export type AutomationEngineResult = {
  tenantId: string;
  runsStarted: number;
  runsCompleted: number;
  runsSkipped: number;
  runsFailed: number;
  runs: AutomationRunRecord[];
};

export const TRIGGER_TO_MODULE: Record<AutomationTriggerType, AutomationModule> = {
  prodotto_sotto_scorta: "magazzino",
  prodotto_in_scadenza: "magazzino",
  food_cost_sopra_target: "food_cost",
  beverage_cost_sopra_target: "cantina",
  margine_sotto_soglia: "food_cost",
  personale_insufficiente: "staff",
  overstaffing: "staff",
  prenotazioni_elevate: "prenotazioni",
  occupazione_hotel_elevata: "hotel",
  haccp_non_conforme: "haccp",
  temperatura_fuori_limite: "haccp",
  camera_pronta: "housekeeping",
  camera_in_ritardo: "housekeeping",
  pagamento_in_scadenza: "cassa",
  licenza_saas_in_scadenza: "licenze",
  manutenzione_hardware: "hardware",
  evento_calendario: "catering",
  previsione_meteo_critica: "dashboard",
};

export const MODULE_DECISION_DOMAIN: Partial<Record<AutomationModule, AiDecisionDomain>> = {
  magazzino: "reorder",
  food_cost: "food_cost",
  cantina: "cantina_promo",
  crm: "crm_vip",
  prenotazioni: "pricing",
  hotel: "hotel_occupancy",
  staff: "staff_shifts",
  turni: "staff_shifts",
  haccp: "supervisor_anomaly",
  supervisor: "supervisor_anomaly",
  dashboard: "supervisor_anomaly",
};

export const DEFAULT_TRIGGER_THRESHOLDS: Record<string, number> = {
  lowStockRatio: 1.0,
  expiringDays: 7,
  foodCostPct: 35,
  beverageCostPct: 28,
  marginPct: 15,
  bookingSurgePct: 120,
  hotelOccupancyPct: 85,
  licenseExpiryDays: 30,
  paymentDueDays: 7,
  weatherSeverity: 7,
};

export const AUTOMATION_TIMEOUT_MS = Number(process.env.AI_AUTOMATION_TIMEOUT_MS || 120_000);

import { isAutomationEnabledSync } from "@/lib/ai/platform-config.runtime";

export function isAutomationEnabled(): boolean {
  return isAutomationEnabledSync();
}

export function buildIdempotencyKey(
  tenantId: string,
  trigger: AutomationTriggerType,
  module: AutomationModule,
  bucket = new Date().toISOString().slice(0, 13),
): string {
  return `${tenantId}:${module}:${trigger}:${bucket}`;
}
