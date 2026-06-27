import type { KitchenProposalDraft } from "@/lib/db/repositories/ai-kitchen.repository";
import { AI_DECISION_DOMAINS, type AiDecisionDomain, type AiDecisionEnvelope } from "@/lib/ai/decisions/types";

/** Mappa dominio decisionale → tipo proposta esistente (nessuna modifica schema). */
const DOMAIN_TO_PROPOSAL_TYPE: Record<AiDecisionDomain, KitchenProposalDraft["type"]> = {
  reorder: "reorder",
  inventory_depletion: "warehouse",
  food_cost: "food_cost",
  pricing: "pricing",
  staff_shifts: "manager_report",
  hotel_occupancy: "hotel_bridge",
  cantina_promo: "warehouse",
  crm_vip: "manager_report",
  supervisor_anomaly: "manager_report",
};

const DOMAIN_TITLES: Record<AiDecisionDomain, string> = {
  reorder: "Riordino intelligente (AI + regole)",
  inventory_depletion: "Previsione esaurimenti magazzino",
  food_cost: "Food cost ottimizzato AI",
  pricing: "Pricing dinamico AI",
  staff_shifts: "Turni ottimali staff",
  hotel_occupancy: "Previsione occupazione hotel",
  cantina_promo: "Promozioni cantina AI",
  crm_vip: "Segmentazione CRM VIP",
  supervisor_anomaly: "Anomalie operative supervisor",
};

export function decisionToProposalDraft(decision: AiDecisionEnvelope): KitchenProposalDraft {
  const aiSummary = decision.aiEnhanced?.motivation ?? decision.ruleBased.summary;
  const summary = decision.aiEnhanced
    ? `[AI confidenza ${Math.round(decision.aiEnhanced.confidence * 100)}%] ${aiSummary}`
    : decision.ruleBased.summary;

  return {
    type: DOMAIN_TO_PROPOSAL_TYPE[decision.domain],
    title: DOMAIN_TITLES[decision.domain],
    summary,
    payload: {
      domain: decision.domain,
      generatedAt: decision.generatedAt,
      reviewStatus: decision.reviewStatus,
      ruleBased: decision.ruleBased,
      aiEnhanced: decision.aiEnhanced,
      /** Compatibilità con payload proposte kitchen esistenti */
      legacy: {
        ruleRecommendation: decision.ruleBased.recommendation,
        aiRecommendation: decision.aiEnhanced?.recommendation ?? null,
      },
    },
  };
}

export function decisionsToProposalDrafts(decisions: AiDecisionEnvelope[]): KitchenProposalDraft[] {
  return decisions.map(decisionToProposalDraft);
}

export function isAiDecisionDomain(value: string): value is AiDecisionDomain {
  return (AI_DECISION_DOMAINS as readonly string[]).includes(value);
}
