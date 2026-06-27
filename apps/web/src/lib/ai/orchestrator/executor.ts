import { runModuleAi } from "@/lib/ai/module-ai.service";
import type { ModuleAiResponse } from "@/lib/ai/modules/types";
import type {
  OrchestratorContext,
  OrchestratorModuleId,
  OrchestratorModuleResult,
} from "@/lib/ai/orchestrator/types";

export type ModuleRunner = (
  moduleSlug: string,
  ctx: { tenantId: string; userId?: string },
  req: { enrich?: boolean; locale?: string; periodDays?: number },
) => Promise<ModuleAiResponse | null>;

const MODULE_SLUG: Record<OrchestratorModuleId, string> = {
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
};

export async function executeModules(
  modules: OrchestratorModuleId[],
  ctx: OrchestratorContext,
  options?: { enrich?: boolean; moduleRunner?: ModuleRunner },
): Promise<OrchestratorModuleResult[]> {
  const runner = options?.moduleRunner ?? runModuleAi;

  const results = await Promise.all(
    modules.map(async (module): Promise<OrchestratorModuleResult> => {
      const slug = MODULE_SLUG[module];
      try {
        const response = await runner(
          slug,
          { tenantId: ctx.tenantId, userId: ctx.userId },
          { enrich: options?.enrich ?? false, locale: ctx.locale, periodDays: ctx.periodDays },
        );

        if (!response) {
          return {
            module,
            moduleId: slug as OrchestratorModuleResult["moduleId"],
            snapshot: null,
            insights: null,
            source: "rules",
            error: "Modulo non disponibile",
          };
        }

        return {
          module,
          moduleId: response.module,
          snapshot: response.snapshot,
          insights: response.insights,
          source: response.source,
        };
      } catch (e) {
        return {
          module,
          moduleId: slug as OrchestratorModuleResult["moduleId"],
          snapshot: null,
          insights: null,
          source: "rules",
          error: e instanceof Error ? e.message : "Errore modulo",
        };
      }
    }),
  );

  return results;
}

export { MODULE_SLUG };
