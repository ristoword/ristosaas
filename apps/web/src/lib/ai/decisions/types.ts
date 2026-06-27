/** Domini decisionali: ogni dominio mantiene la regola esistente come fallback. */
export const AI_DECISION_DOMAINS = [
  "reorder",
  "inventory_depletion",
  "food_cost",
  "pricing",
  "staff_shifts",
  "hotel_occupancy",
  "cantina_promo",
  "crm_vip",
  "supervisor_anomaly",
] as const;

export type AiDecisionDomain = (typeof AI_DECISION_DOMAINS)[number];

export type ConfidenceLevel = "low" | "medium" | "high";

/** Layer AI sopra la regola — sempre con motivazione, confidenza e dati usati. */
export type AiDecisionLayer = {
  recommendation: Record<string, unknown>;
  motivation: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  dataUsed: string[];
  /** true se OpenAI non disponibile o ha rifiutato di migliorare la regola */
  fallbackToRule: boolean;
};

export type RuleBasedDecision = {
  summary: string;
  recommendation: unknown;
  source: "rules";
};

/** Decisione completa: regola + AI opzionale + stato review. */
export type AiDecisionEnvelope = {
  domain: AiDecisionDomain;
  generatedAt: string;
  ruleBased: RuleBasedDecision;
  aiEnhanced: AiDecisionLayer | null;
  /** pending_review quando AI propone un cambiamento rispetto alla regola */
  reviewStatus: "pending_review" | "not_required";
};

export type AiDecisionGenerateRequest = {
  domains?: AiDecisionDomain[];
  periodDays?: number;
  locale?: string;
  persist?: boolean;
  enrich?: boolean;
  status?: "draft" | "pending_review";
};

export type AiDecisionGenerateResult = {
  generatedAt: string;
  periodDays: number;
  decisions: AiDecisionEnvelope[];
  proposals?: Array<{ id: string; type: string; status: string }>;
  source: "rules" | "rules+ai";
};

export function confidenceFromScore(score: number): ConfidenceLevel {
  if (score >= 0.75) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

export function parseStructuredAiLayer(raw: unknown, ruleFallback: boolean): AiDecisionLayer | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const motivation = typeof obj.motivation === "string" ? obj.motivation.trim() : "";
  if (!motivation) return null;

  const confidenceRaw = Number(obj.confidence);
  const confidence = Number.isFinite(confidenceRaw) ? Math.min(1, Math.max(0, confidenceRaw)) : 0.5;
  const dataUsed = Array.isArray(obj.dataUsed)
    ? obj.dataUsed.filter((d): d is string => typeof d === "string")
    : [];

  return {
    recommendation:
      obj.recommendation && typeof obj.recommendation === "object"
        ? (obj.recommendation as Record<string, unknown>)
        : {},
    motivation,
    confidence,
    confidenceLevel:
      obj.confidenceLevel === "low" || obj.confidenceLevel === "medium" || obj.confidenceLevel === "high"
        ? obj.confidenceLevel
        : confidenceFromScore(confidence),
    dataUsed,
    fallbackToRule: Boolean(obj.fallbackToRule ?? ruleFallback),
  };
}
