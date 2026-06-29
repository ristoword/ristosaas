/**
 * Single source of truth for AI module ID namespaces:
 * - ModuleId (registry / snapshots):     kitchen, foodcost, inventory
 * - OrchestratorModuleId (routing):      same as registry for orchestrated modules
 * - AutomationModule (workflows / cron): food_cost, magazzino, licenze
 * - Nav / UI hints:                      cucina, food-cost, magazzino, …
 */
import type { AutomationModule } from "@/lib/ai/automation/types";
import { AUTOMATION_MODULES } from "@/lib/ai/automation/types";
import type { ModuleId } from "@/lib/ai/modules/types";
import { MODULE_IDS } from "@/lib/ai/modules/types";
import type { OrchestratorModuleId } from "@/lib/ai/orchestrator/types";
import { ORCHESTRATOR_MODULE_IDS } from "@/lib/ai/orchestrator/types";

const MODULE_SET = new Set<string>(MODULE_IDS);
const ORCHESTRATOR_SET = new Set<string>(ORCHESTRATOR_MODULE_IDS);
const AUTOMATION_SET = new Set<string>(AUTOMATION_MODULES);

/** Orchestrator agent → module registry ID (1:1 today). */
export const ORCHESTRATOR_TO_MODULE = {
  sala: "sala",
  kitchen: "kitchen",
  foodcost: "foodcost",
  inventory: "inventory",
  cantina: "cantina",
  bar: "bar",
  pizzeria: "pizzeria",
  crm: "crm",
  hotel: "hotel",
  reception: "reception",
  housekeeping: "housekeeping",
  prenotazioni: "prenotazioni",
  catering: "catering",
  dashboard: "dashboard",
  supervisor: "supervisor",
  staff: "staff",
  turni: "turni",
  haccp: "haccp",
  hardware: "hardware",
} as const satisfies Record<OrchestratorModuleId, ModuleId>;

/** Module registry → automation workflow slug. */
export const MODULE_TO_AUTOMATION: Partial<Record<ModuleId, AutomationModule>> = {
  inventory: "magazzino",
  foodcost: "food_cost",
  cantina: "cantina",
  crm: "crm",
  prenotazioni: "prenotazioni",
  hotel: "hotel",
  housekeeping: "housekeeping",
  "room-service": "room_service",
  staff: "staff",
  turni: "turni",
  haccp: "haccp",
  catering: "catering",
  sala: "sala",
  cassa: "cassa",
  dashboard: "dashboard",
  owner: "owner",
  supervisor: "supervisor",
  hardware: "hardware",
  licenses: "licenze",
};

/** Automation slug → module registry (inverse of MODULE_TO_AUTOMATION). */
export const AUTOMATION_TO_MODULE: Partial<Record<AutomationModule, ModuleId>> = Object.fromEntries(
  Object.entries(MODULE_TO_AUTOMATION).map(([mod, auto]) => [auto, mod]),
) as Partial<Record<AutomationModule, ModuleId>>;

/**
 * Every external slug / hint / legacy ID → canonical ModuleId.
 * Includes orchestrator IDs, automation slugs, nav IDs, and Italian aliases.
 */
export const MODULE_ID_ALIASES: Record<string, ModuleId> = {
  // Registry canonical (identity)
  ...Object.fromEntries(MODULE_IDS.map((id) => [id, id])) as Record<ModuleId, ModuleId>,

  // Orchestrator (same IDs, explicit for clarity)
  ...ORCHESTRATOR_TO_MODULE,

  // Italian / nav / legacy → registry
  cucina: "kitchen",
  magazzino: "inventory",
  warehouse: "inventory",
  stock: "inventory",
  food_cost: "foodcost",
  "food-cost": "foodcost",
  customers: "crm",
  briefing: "dashboard",
  rooms: "sala",
  licenze: "licenses",
  licenses: "licenses",
  room_service: "room-service",
  "super-admin": "super-admin",
  superadmin: "super-admin",

  // Nav-config IDs
  "hotel-rooms": "hotel",
  "hotel-reservations": "hotel",
  "hotel-checkin": "hotel",
  "hotel-housekeeping": "housekeeping",
  "ai-assistente": "dashboard",
  "ai-command-center": "supervisor",
};

/** Stream-status / chat context key per orchestrator module. */
export const ORCHESTRATOR_STREAM_CONTEXT: Record<OrchestratorModuleId, string> = {
  sala: "sala",
  kitchen: "cucina",
  foodcost: "cucina",
  inventory: "magazzino",
  cantina: "cantina",
  bar: "bar",
  pizzeria: "pizzeria",
  crm: "prenotazioni",
  hotel: "hotel",
  reception: "hotel",
  housekeeping: "hotel",
  prenotazioni: "prenotazioni",
  catering: "sala",
  dashboard: "risto",
  supervisor: "supervisor",
  staff: "supervisor",
  turni: "supervisor",
  haccp: "cucina",
  hardware: "supervisor",
};

/** Automation module → dashboard deep-link. */
export const AUTOMATION_NAV_HREF: Partial<Record<AutomationModule, string>> = {
  magazzino: "/magazzino",
  food_cost: "/cucina",
  cantina: "/cantina",
  hotel: "/hotel",
  haccp: "/haccp",
  staff: "/staff",
  supervisor: "/supervisor",
  hardware: "/hardware",
  licenze: "/licenses",
  cassa: "/cassa",
  dashboard: "/dashboard",
  prenotazioni: "/prenotazioni",
  catering: "/catering",
  sala: "/rooms",
  housekeeping: "/hotel/housekeeping",
  room_service: "/hotel/room-service",
  owner: "/owner",
  turni: "/turni",
};

function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

function lookupAlias(slug: string): ModuleId | undefined {
  if (MODULE_ID_ALIASES[slug]) return MODULE_ID_ALIASES[slug];
  const hyphen = slug.replace(/_/g, "-");
  if (MODULE_ID_ALIASES[hyphen]) return MODULE_ID_ALIASES[hyphen];
  const underscore = slug.replace(/-/g, "_");
  if (MODULE_ID_ALIASES[underscore]) return MODULE_ID_ALIASES[underscore];
  return undefined;
}

/** Resolve any slug to canonical ModuleId, or null if unknown. */
export function resolveModuleId(raw: string): ModuleId | null {
  const slug = normalizeSlug(raw);
  const aliased = lookupAlias(slug);
  if (aliased && MODULE_SET.has(aliased)) return aliased;
  if (MODULE_SET.has(slug)) return slug as ModuleId;
  const fromAutomation = AUTOMATION_TO_MODULE[slug as AutomationModule];
  if (fromAutomation) return fromAutomation;
  return null;
}

/** Resolve slug to orchestrator module ID (routing / planner). */
export function resolveOrchestratorModuleId(raw: string): OrchestratorModuleId | null {
  const moduleId = resolveModuleId(raw);
  if (moduleId && ORCHESTRATOR_SET.has(moduleId)) {
    return moduleId as OrchestratorModuleId;
  }
  const slug = normalizeSlug(raw);
  if (ORCHESTRATOR_SET.has(slug)) return slug as OrchestratorModuleId;
  return null;
}

/** Orchestrator agent → module registry ID for snapshot execution. */
export function orchestratorToModuleId(module: OrchestratorModuleId): ModuleId {
  return ORCHESTRATOR_TO_MODULE[module];
}

/** Module registry → orchestrator ID when orchestrated. */
export function moduleToOrchestratorId(moduleId: ModuleId): OrchestratorModuleId | null {
  if (ORCHESTRATOR_SET.has(moduleId)) return moduleId as OrchestratorModuleId;
  return null;
}

/** Resolve slug to automation workflow module slug. */
export function resolveAutomationModule(raw: string): AutomationModule | null {
  const slug = normalizeSlug(raw);
  if (AUTOMATION_SET.has(slug)) return slug as AutomationModule;

  const moduleId = resolveModuleId(slug);
  if (moduleId) {
    const auto = MODULE_TO_AUTOMATION[moduleId];
    if (auto) return auto;
  }

  const fromAuto = AUTOMATION_TO_MODULE[slug as AutomationModule];
  if (fromAuto) return slug as AutomationModule;

  return null;
}

export function moduleToAutomation(moduleId: ModuleId): AutomationModule | null {
  return MODULE_TO_AUTOMATION[moduleId] ?? null;
}

export function automationToModule(auto: AutomationModule): ModuleId | null {
  return AUTOMATION_TO_MODULE[auto] ?? null;
}

/** Nav IDs with UI-specific automation filter (differs from logical module mapping). */
const NAV_AUTOMATION_OVERRIDES: Record<string, AutomationModule> = {
  cucina: "food_cost",
  pizzeria: "food_cost",
  bar: "cantina",
};

/** Nav / UI hint → automation slug for command-center filters (legacy compat). */
export function resolveNavAiModule(navId: string): string {
  const slug = normalizeSlug(navId);
  if (NAV_AUTOMATION_OVERRIDES[slug]) return NAV_AUTOMATION_OVERRIDES[slug];

  const automation = resolveAutomationModule(slug);
  if (automation) return automation;
  const moduleId = resolveModuleId(slug);
  if (moduleId) return moduleToAutomation(moduleId) ?? moduleId;
  return navId;
}

/** Alias keys only (non-identity) for registry tests and docs. */
export const MODULE_ALIASES: Record<string, ModuleId> = Object.fromEntries(
  Object.entries(MODULE_ID_ALIASES).filter(([key, value]) => key !== value),
) as Record<string, ModuleId>;
