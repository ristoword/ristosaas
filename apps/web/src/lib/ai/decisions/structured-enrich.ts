import { callLlmChatCompletion, resolveProviderApiKey } from "@/lib/ai/runtime/llm-provider";
import type { AiDecisionDomain, AiDecisionLayer } from "@/lib/ai/decisions/types";
import { parseStructuredAiLayer } from "@/lib/ai/decisions/types";
import { resolveAgentWithPrompts } from "@/lib/ai/runtime/agent-resolver";
import { buildTelemetry, logAiRequest, usageFromOpenAi } from "@/lib/ai/runtime/telemetry";

const DOMAIN_CONTEXT: Record<AiDecisionDomain, string> = {
  reorder: "magazzino",
  inventory_depletion: "magazzino",
  food_cost: "foodcost",
  pricing: "dashboard",
  staff_shifts: "staff",
  hotel_occupancy: "hotel",
  cantina_promo: "cantina",
  crm_vip: "crm",
  supervisor_anomaly: "supervisor",
};

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

function buildDecisionOverlay(domain: AiDecisionDomain, locale: string) {
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
  tenantId?: string;
  userId?: string;
}): Promise<AiDecisionLayer | null> {
  const locale = params.locale ?? "it";
  const context = DOMAIN_CONTEXT[params.domain];
  const startedAt = Date.now();

  let runtime: Awaited<ReturnType<typeof resolveAgentWithPrompts>>["runtime"] | null = null;
  let systemPrompt = buildDecisionOverlay(params.domain, locale);

  if (params.tenantId) {
    const resolved = await resolveAgentWithPrompts(params.tenantId, context);
    runtime = resolved.runtime;
    if (!runtime.active) return null;

    if (resolved.prompts.systemPrompt.trim()) {
      systemPrompt = `${resolved.prompts.systemPrompt.trim()}\n\n${systemPrompt}`;
    }
    if (resolved.prompts.userPrompt.trim()) {
      systemPrompt = `${systemPrompt}\n\n${resolved.prompts.userPrompt.trim()}`;
    }
  }

  if (params.tenantId && process.env.AI_LEARNING_ENABLED !== "false") {
    try {
      const { getLearnedContextBlock } = await import("@/lib/ai/learning/trainer");
      const learned = await getLearnedContextBlock(params.tenantId, params.domain);
      if (learned) systemPrompt = `${systemPrompt}\n\n${learned}`;
    } catch {
      /* non-blocking */
    }
  }

  const userContent = JSON.stringify(
    {
      domain: params.domain,
      ruleBased: params.ruleBased,
      supplementalContext: params.supplementalContext,
    },
    null,
    0,
  ).slice(0, 14000);

  const model = runtime?.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const temperature = runtime ? Math.min(runtime.temperature, 0.35) : 0.35;
  const maxTokens = runtime ? Math.min(runtime.maxTokens, 1200) : 1200;
  const provider = runtime?.provider ?? "openai";
  const apiKey = resolveProviderApiKey(provider);
  if (!apiKey) return null;

  const { content, usage } = await callLlmChatCompletion(
    provider,
    apiKey,
    {
      model,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    },
    params.signal,
  );

  if (!content) return null;

  let layer: AiDecisionLayer | null = null;
  try {
    const parsed = JSON.parse(content) as unknown;
    layer = parseStructuredAiLayer(parsed, false);
  } catch {
    return null;
  }

  if (runtime && params.tenantId && params.userId) {
    const tokens = usageFromOpenAi(usage, userContent, content);
    await logAiRequest({
      tenantId: params.tenantId,
      userId: params.userId,
      context: `decision:${params.domain}`,
      userMessage: `Decisione ${params.domain}`,
      assistantMessage: content.slice(0, 4000),
      telemetry: buildTelemetry({
        runtime,
        ...tokens,
        durationMs: Date.now() - startedAt,
        ragUsed: false,
        ragDocumentsCount: 0,
      }),
    });
  }

  return layer;
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
