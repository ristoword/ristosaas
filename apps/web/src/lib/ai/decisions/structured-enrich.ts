import { DEFAULT_MODEL, TEMPERATURE } from "@/lib/ai/chat-core";
import { callOpenAIChatCompletion } from "@/lib/ai/openai-stream";
import type { AiDecisionDomain, AiDecisionLayer } from "@/lib/ai/decisions/types";
import { parseStructuredAiLayer } from "@/lib/ai/decisions/types";

const DOMAIN_PROMPTS: Record<AiDecisionDomain, string> = {
  reorder:
    "Ottimizza le quantità di riordino considerando consumo storico, stagionalità, prenotazioni, eventi catering, coperti hotel, trend vendite e lead time fornitore (paymentTerms). Non scendere sotto il minimo rule-based.",
  inventory_depletion:
    "Prevedi esaurimenti scorte e priorità di intervento usando movimenti, prodotti in scadenza, stagnanti e domanda prevista.",
  food_cost:
    "Suggerisci modifiche prezzo/ricetta per piatti critici. Rispetta i margini rule-based come floor di sicurezza.",
  pricing:
    "Affina il pricing dinamico rule-based con domanda, stagionalità e prenotazioni. Indica delta prezzo consigliato.",
  staff_shifts:
    "Suggerisci turni ottimali per copertura sala/cucina/bar in base a prenotazioni, hotel e storico incassi.",
  hotel_occupancy:
    "Prevedi occupazione camere prossimi 7 giorni usando trend, prenotazioni attive e stagionalità.",
  cantina_promo:
    "Suggerisci promozioni vini (bundle, upsell, smaltimento annate) basate su giacenze, margini e raccomandazioni rule-based.",
  crm_vip:
    "Identifica clienti da promuovere a VIP/habitue con scoring e motivazione. Non rimuovere segmentazioni manuali esistenti.",
  supervisor_anomaly:
    "Individua anomalie operative (margini, storni, scorte, incassi) rispetto ai pattern rule-based e segnala priorità.",
};

function buildSystemPrompt(domain: AiDecisionDomain, locale: string) {
  const lang = locale.startsWith("en") ? "English" : "italiano";
  return `Sei il motore decisionale AI di RistoSimply (dominio: ${domain}).
La logica rule-based fornita è il FALLBACK DI SICUREZZA — non contraddirla senza motivazione forte.
Migliora o arricchisci la raccomandazione rule-based usando il contesto supplementare.

Rispondi SOLO con JSON valido:
{
  "recommendation": { ... oggetto specifico per il dominio ... },
  "motivation": "stringa che spiega perché",
  "confidence": 0.0-1.0,
  "confidenceLevel": "low"|"medium"|"high",
  "dataUsed": ["elenco", "dati", "utilizzati"],
  "fallbackToRule": false
}

Regole:
- Usa SOLO numeri presenti nei dati forniti.
- Se dati insufficienti, imposta fallbackToRule=true e allinea recommendation alla regola.
- Lingua motivazione: ${lang}.
- Focus: ${DOMAIN_PROMPTS[domain]}.`;
}

export async function enrichRuleWithAi(params: {
  domain: AiDecisionDomain;
  ruleBased: unknown;
  supplementalContext: unknown;
  locale?: string;
  signal?: AbortSignal;
}): Promise<AiDecisionLayer | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const locale = params.locale ?? "it";
  const userContent = JSON.stringify(
    {
      domain: params.domain,
      ruleBased: params.ruleBased,
      supplementalContext: params.supplementalContext,
    },
    null,
    0,
  ).slice(0, 14000);

  const { content } = await callOpenAIChatCompletion(
    apiKey,
    {
      model: DEFAULT_MODEL,
      temperature: Math.min(TEMPERATURE, 0.35),
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(params.domain, locale) },
        { role: "user", content: userContent },
      ],
    },
    params.signal,
  );

  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as unknown;
    return parseStructuredAiLayer(parsed, false);
  } catch {
    return null;
  }
}

/** Fallback layer quando OpenAI non è disponibile — espone la regola con metadati. */
export function ruleOnlyLayer(recommendation: unknown, dataUsed: string[]): AiDecisionLayer {
  return {
    recommendation:
      recommendation && typeof recommendation === "object"
        ? (recommendation as Record<string, unknown>)
        : { value: recommendation },
    motivation: "Raccomandazione rule-based (fallback di sicurezza). AI non disponibile o dati insufficienti.",
    confidence: 0.55,
    confidenceLevel: "medium",
    dataUsed,
    fallbackToRule: true,
  };
}
