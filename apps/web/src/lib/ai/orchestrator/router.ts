import { resolveOrchestratorModuleId } from "@/lib/ai/module-ids";
import type { OrchestratorModuleId } from "@/lib/ai/orchestrator/types";
import { ORCHESTRATOR_MODULE_IDS } from "@/lib/ai/orchestrator/types";

/** Keyword rule-based per routing moduli (fallback di sicurezza). */
export const MODULE_KEYWORDS: Record<OrchestratorModuleId, readonly string[]> = {
  sala: ["sala", "tavol", "comand", "camerier", "copert", "servizio", "ordine tavolo"],
  kitchen: ["cucina", "piatt", "ricett", "comand", "preparaz", "forno", "menu del giorno"],
  foodcost: ["food cost", "foodcost", "margine", "costo piatto", "costo ricetta", "perdita"],
  inventory: ["magazzino", "scort", "riordino", "lott", "scadenza", "inventario", "stock", "fornitore"],
  cantina: ["cantina", "vino", "bottiglia", "annata", "enoteca", "carte vini"],
  bar: ["bar", "drink", "cocktail", "bevand", "bancone"],
  pizzeria: ["pizzeria", "pizza", "impasto", "forno pizza"],
  crm: ["client", "crm", "vip", "fidel", "allerg", "profilo", "abitual"],
  hotel: ["hotel", "camera", "occupaz", "soggiorn", "prenotazione hotel", "check-in", "check-out"],
  reception: ["reception", "front desk", "front-desk", "arriv", "partenz", "folio"],
  housekeeping: ["housekeeping", "puliz", "camera da pulire", "housekeeper", "governante"],
  prenotazioni: ["prenotaz", "booking", "tavolo prenot", "lista prenot"],
  catering: ["catering", "evento", "banquet", "buffet"],
  dashboard: ["dashboard", "panoramica", "situazione", "briefing", "oggi", "giornata", "overview", "kpi"],
  supervisor: ["supervisor", "supervision", "anomal", "storno", "report manager", "controllo"],
  staff: ["staff", "personale", "premi", "performance", "camerier"],
  turni: ["turni", "turno", "pianificaz", "orario", "shift", "timbratur"],
  haccp: ["haccp", "temperatur", "igiene", "conform", "frigo", "abbattitore"],
  hardware: ["hardware", "stampant", "kds", "dispositiv", "keycard", "router stamp"],
};

export type RouteScore = {
  module: OrchestratorModuleId;
  score: number;
  matchedKeywords: string[];
};

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function scoreModule(query: string, module: OrchestratorModuleId): RouteScore {
  const normalized = normalizeQuery(query);
  const matchedKeywords: string[] = [];
  let score = 0;

  for (const keyword of MODULE_KEYWORDS[module]) {
    if (normalized.includes(keyword.toLowerCase())) {
      score += keyword.length >= 6 ? 2 : 1;
      matchedKeywords.push(keyword);
    }
  }

  return { module, score, matchedKeywords };
}

export function routeQuery(
  query: string,
  options?: { contextHint?: string; maxModules?: number },
): RouteScore[] {
  const maxModules = options?.maxModules ?? 5;
  const scores = ORCHESTRATOR_MODULE_IDS.map((module) => scoreModule(query, module));

  if (options?.contextHint) {
    const hint = options.contextHint.trim().toLowerCase();
    const hinted = resolveOrchestratorModuleId(hint);
    if (hinted && ORCHESTRATOR_MODULE_IDS.includes(hinted)) {
      const existing = scores.find((s) => s.module === hinted);
      if (existing) {
        existing.score += 5;
        existing.matchedKeywords.push(`hint:${hint}`);
      }
    }
  }

  const ranked = scores
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxModules);

  if (ranked.length > 0) return ranked;

  // Fallback: dashboard + supervisor per domande generiche
  return [
    { module: "dashboard", score: 1, matchedKeywords: ["fallback:dashboard"] },
    { module: "supervisor", score: 1, matchedKeywords: ["fallback:supervisor"] },
  ];
}

export function modulesFromScores(scores: RouteScore[]): OrchestratorModuleId[] {
  return scores.map((s) => s.module);
}
