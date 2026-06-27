import type {
  AutomationConfig,
  AutomationLevel,
  AutomationModule,
  AutomationTriggerType,
  WorkflowDefinition,
} from "@/lib/ai/automation/types";
import { AUTOMATION_MODULES, AUTOMATION_TRIGGERS, TRIGGER_TO_MODULE } from "@/lib/ai/automation/types";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

function defaultTriggers(): Record<AutomationTriggerType, boolean> {
  return Object.fromEntries(AUTOMATION_TRIGGERS.map((t) => [t, true])) as Record<AutomationTriggerType, boolean>;
}

function mapConfig(row: {
  tenantId: string;
  module: string;
  role: string | null;
  level: number;
  enabled: boolean;
  triggers: unknown;
  conditions: unknown;
  updatedAt: Date;
}): AutomationConfig {
  const triggersRaw = (row.triggers ?? {}) as Partial<Record<AutomationTriggerType, boolean>>;
  const merged = { ...defaultTriggers(), ...triggersRaw };
  return {
    tenantId: row.tenantId,
    module: row.module as AutomationModule,
    role: row.role,
    level: Math.min(3, Math.max(1, row.level)) as AutomationLevel,
    enabled: row.enabled,
    triggers: merged,
    conditions: (row.conditions ?? {}) as Record<string, unknown>,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const automationConfigStore = {
  async get(tenantId: string, module: AutomationModule, role: string | null = null): Promise<AutomationConfig> {
    const row = await prisma.aiAutomationConfig.findUnique({
      where: { tenantId_module_role: { tenantId, module, role: role ?? "" } },
    });
    if (row) return mapConfig(row);

    const created = await prisma.aiAutomationConfig.create({
      data: {
        tenantId,
        module,
        role: role ?? "",
        level: 2,
        enabled: true,
        triggers: defaultTriggers() as unknown as Prisma.InputJsonValue,
        conditions: {},
      },
    });
    return mapConfig(created);
  },

  async list(tenantId: string): Promise<AutomationConfig[]> {
    const rows = await prisma.aiAutomationConfig.findMany({ where: { tenantId } });
    if (rows.length === 0) {
      await Promise.all(AUTOMATION_MODULES.map((m) => this.get(tenantId, m)));
      return this.list(tenantId);
    }
    return rows.map(mapConfig);
  },

  async upsert(params: {
    tenantId: string;
    module: AutomationModule;
    role?: string | null;
    level?: AutomationLevel;
    enabled?: boolean;
    triggers?: Partial<Record<AutomationTriggerType, boolean>>;
    conditions?: Record<string, unknown>;
  }): Promise<AutomationConfig> {
    const role = params.role ?? "";
    const existing = await this.get(params.tenantId, params.module, role || null);
    const row = await prisma.aiAutomationConfig.upsert({
      where: { tenantId_module_role: { tenantId: params.tenantId, module: params.module, role } },
      create: {
        tenantId: params.tenantId,
        module: params.module,
        role,
        level: params.level ?? 2,
        enabled: params.enabled ?? true,
        triggers: { ...existing.triggers, ...params.triggers } as unknown as Prisma.InputJsonValue,
        conditions: { ...existing.conditions, ...params.conditions } as Prisma.InputJsonValue,
      },
      update: {
        ...(params.level !== undefined ? { level: params.level } : {}),
        ...(params.enabled !== undefined ? { enabled: params.enabled } : {}),
        ...(params.triggers !== undefined
          ? { triggers: { ...existing.triggers, ...params.triggers } as Prisma.InputJsonValue }
          : {}),
        ...(params.conditions !== undefined
          ? { conditions: { ...existing.conditions, ...params.conditions } as Prisma.InputJsonValue }
          : {}),
      },
    });
    return mapConfig(row);
  },

  resolveLevel(
    configs: AutomationConfig[],
    module: AutomationModule,
    userRole?: string,
  ): AutomationLevel {
    const roleConfig = userRole
      ? configs.find((c) => c.module === module && c.role === userRole && c.enabled)
      : undefined;
    const moduleConfig = configs.find((c) => c.module === module && !c.role && c.enabled);
    const cfg = roleConfig ?? moduleConfig ?? configs.find((c) => c.module === module);
    return cfg?.enabled ? cfg.level : 2;
  },

  isTriggerEnabled(configs: AutomationConfig[], trigger: AutomationTriggerType): boolean {
    const automationModule = TRIGGER_TO_MODULE[trigger];
    const cfg = configs.find((c) => c.module === automationModule && !c.role);
    if (!cfg?.enabled) return false;
    return cfg.triggers[trigger] !== false;
  },
};

export const WORKFLOW_CATALOG: WorkflowDefinition[] = [
  {
    id: "magazzino-reorder",
    module: "magazzino",
    triggers: ["prodotto_sotto_scorta", "prodotto_in_scadenza"],
    decisionDomain: "reorder",
    defaultLevel: 2,
    notifyRoles: ["supervisor", "owner", "magazzino"],
    steps: [
      { type: "analyze", label: "Analisi consumi, prenotazioni, hotel, catering" },
      { type: "propose", label: "Proposta ordine fornitore" },
      { type: "execute", label: "Crea ordine e invia email" },
      { type: "notify", label: "Notifica supervisor e dashboard" },
      { type: "audit", label: "Audit log" },
    ],
  },
  {
    id: "food-cost-optimize",
    module: "food_cost",
    triggers: ["food_cost_sopra_target", "margine_sotto_soglia"],
    decisionDomain: "food_cost",
    defaultLevel: 2,
    notifyRoles: ["supervisor", "owner", "cucina"],
    steps: [
      { type: "analyze", label: "Analisi food cost e margini" },
      { type: "propose", label: "Proposta pricing/ricetta" },
      { type: "notify", label: "Alert chef e owner" },
      { type: "audit", label: "Audit log" },
    ],
  },
  {
    id: "cantina-promo",
    module: "cantina",
    triggers: ["beverage_cost_sopra_target"],
    decisionDomain: "cantina_promo",
    defaultLevel: 2,
    notifyRoles: ["supervisor", "bar"],
    steps: [
      { type: "analyze", label: "Analisi beverage cost" },
      { type: "propose", label: "Promozione cantina" },
      { type: "notify", label: "Notifica bar" },
      { type: "audit", label: "Audit log" },
    ],
  },
  {
    id: "staff-coverage",
    module: "staff",
    triggers: ["personale_insufficiente", "overstaffing"],
    decisionDomain: "staff_shifts",
    defaultLevel: 2,
    notifyRoles: ["supervisor", "owner"],
    steps: [
      { type: "analyze", label: "Analisi turni e copertura" },
      { type: "propose", label: "Proposta turni" },
      { type: "notify", label: "Notifica staff" },
      { type: "audit", label: "Audit log" },
    ],
  },
  {
    id: "hotel-occupancy",
    module: "hotel",
    triggers: ["occupazione_hotel_elevata"],
    decisionDomain: "hotel_occupancy",
    defaultLevel: 2,
    notifyRoles: ["hotel_manager", "reception", "supervisor"],
    steps: [
      { type: "analyze", label: "Previsione occupazione" },
      { type: "propose", label: "Azioni front office" },
      { type: "notify", label: "Notifica reception" },
      { type: "audit", label: "Audit log" },
    ],
  },
  {
    id: "haccp-compliance",
    module: "haccp",
    triggers: ["haccp_non_conforme", "temperatura_fuori_limite"],
    decisionDomain: "supervisor_anomaly",
    defaultLevel: 2,
    notifyRoles: ["supervisor", "cucina", "owner"],
    steps: [
      { type: "analyze", label: "Analisi non conformità HACCP" },
      { type: "propose", label: "Azioni correttive" },
      { type: "notify", label: "Alert HACCP" },
      { type: "audit", label: "Audit log" },
    ],
  },
  {
    id: "housekeeping-rooms",
    module: "housekeeping",
    triggers: ["camera_pronta", "camera_in_ritardo"],
    defaultLevel: 2,
    notifyRoles: ["housekeeping", "hotel_manager", "reception"],
    steps: [
      { type: "analyze", label: "Stato camere" },
      { type: "notify", label: "Notifica housekeeping" },
      { type: "audit", label: "Audit log" },
    ],
  },
  {
    id: "supervisor-ops",
    module: "supervisor",
    triggers: ["previsione_meteo_critica", "evento_calendario", "prenotazioni_elevate"],
    decisionDomain: "supervisor_anomaly",
    defaultLevel: 2,
    notifyRoles: ["supervisor", "owner"],
    steps: [
      { type: "analyze", label: "Analisi operativa unificata" },
      { type: "propose", label: "Proposta supervisor" },
      { type: "notify", label: "Notifica manager" },
      { type: "audit", label: "Audit log" },
    ],
  },
  {
    id: "hardware-maintenance",
    module: "hardware",
    triggers: ["manutenzione_hardware"],
    defaultLevel: 2,
    notifyRoles: ["owner", "supervisor"],
    steps: [
      { type: "analyze", label: "Stato dispositivi" },
      { type: "notify", label: "Alert manutenzione" },
      { type: "audit", label: "Audit log" },
    ],
  },
  {
    id: "license-renewal",
    module: "licenze",
    triggers: ["licenza_saas_in_scadenza"],
    defaultLevel: 1,
    notifyRoles: ["owner", "super_admin"],
    steps: [
      { type: "analyze", label: "Controllo licenza SaaS" },
      { type: "notify", label: "Alert rinnovo" },
      { type: "audit", label: "Audit log" },
    ],
  },
  {
    id: "cassa-payments",
    module: "cassa",
    triggers: ["pagamento_in_scadenza"],
    defaultLevel: 2,
    notifyRoles: ["cassa", "owner", "supervisor"],
    steps: [
      { type: "analyze", label: "Pagamenti in scadenza" },
      { type: "notify", label: "Alert cassa" },
      { type: "audit", label: "Audit log" },
    ],
  },
];

export function findWorkflowForTrigger(trigger: AutomationTriggerType): WorkflowDefinition | undefined {
  return WORKFLOW_CATALOG.find((w) => w.triggers.includes(trigger));
}
