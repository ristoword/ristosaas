import { DEFAULT_MODEL, TEMPERATURE } from "@/lib/ai/chat-core";
import { callOpenAIChatCompletion } from "@/lib/ai/openai-stream";
import { MODULE_KEYWORDS } from "@/lib/ai/orchestrator/router";
import { modulesFromScores, routeQuery } from "@/lib/ai/orchestrator/router";
import type { OrchestratorModuleId, OrchestratorPlan } from "@/lib/ai/orchestrator/types";
import { ORCHESTRATOR_MODULE_IDS } from "@/lib/ai/orchestrator/types";

const VALID_MODULES = new Set<string>(ORCHESTRATOR_MODULE_IDS);

function ruleBasedPlan(query: string, contextHint?: string): OrchestratorPlan {
  const scores = routeQuery(query, { contextHint, maxModules: 5 });
  const modules = modulesFromScores(scores);
  const topMatches = scores
    .slice(0, 3)
    .map((s) => `${s.module}(${s.matchedKeywords.slice(0, 2).join(",")})`)
    .join(", ");

  return {
    modules,
    reasoning: topMatches
      ? `Routing rule-based: moduli selezionati per keyword — ${topMatches}`
      : "Routing rule-based: fallback dashboard + supervisor",
    source: "rules",
  };
}

function parseAiPlanModules(raw: unknown): OrchestratorModuleId[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is string => typeof m === "string" && VALID_MODULES.has(m))
    .slice(0, 5) as OrchestratorModuleId[];
}

export async function planOrchestration(
  query: string,
  options?: { contextHint?: string; locale?: string; useAi?: boolean; signal?: AbortSignal },
): Promise<OrchestratorPlan> {
  const rulePlan = ruleBasedPlan(query, options?.contextHint);

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!options?.useAi || !apiKey) {
    return rulePlan;
  }

  try {
    const moduleList = ORCHESTRATOR_MODULE_IDS.join(", ");
    const keywordSummary = ORCHESTRATOR_MODULE_IDS.map(
      (id) => `${id}: ${MODULE_KEYWORDS[id].slice(0, 4).join(", ")}`,
    ).join("\n");

    const { content } = await callOpenAIChatCompletion(
      apiKey,
      {
        model: DEFAULT_MODEL,
        temperature: Math.min(TEMPERATURE, 0.2),
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Sei il planner dell'orchestratore RistoSimply. Seleziona i moduli rilevanti per la domanda.
Moduli disponibili: ${moduleList}
Rispondi SOLO JSON: {"modules":["modulo1","modulo2"],"reasoning":"breve spiegazione"}
Max 5 moduli. Usa solo ID dalla lista.`,
          },
          {
            role: "user",
            content: `Domanda: ${query}\nHint contesto: ${options?.contextHint ?? "nessuno"}\nKeywords:\n${keywordSummary}\nPiano rule-based suggerito: ${rulePlan.modules.join(", ")}`,
          },
        ],
      },
      options.signal,
    );

    if (!content) return rulePlan;

    const parsed = JSON.parse(content) as { modules?: unknown; reasoning?: string };
    const aiModules = parseAiPlanModules(parsed.modules);

    if (aiModules.length === 0) return rulePlan;

    // Unione: AI modules + rule modules per sicurezza (rule-based sempre presente)
    const merged = [...new Set([...aiModules, ...rulePlan.modules])].slice(0, 5);

    return {
      modules: merged,
      reasoning: typeof parsed.reasoning === "string"
        ? `AI: ${parsed.reasoning} | Regole: ${rulePlan.reasoning}`
        : rulePlan.reasoning,
      source: "rules+ai",
    };
  } catch {
    return rulePlan;
  }
}

export { ruleBasedPlan };
