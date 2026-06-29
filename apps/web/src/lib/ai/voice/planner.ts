import { callLlmChatCompletion, resolveProviderApiKey } from "@/lib/ai/runtime/llm-provider";
import { modulesFromScores, routeQuery } from "@/lib/ai/orchestrator/router";
import type { OrchestratorModuleId } from "@/lib/ai/orchestrator/types";
import { ORCHESTRATOR_STREAM_CONTEXT } from "@/lib/ai/module-ids";
import { resolveAgentRuntime } from "@/lib/ai/runtime/agent-resolver";
import type { VoicePlan } from "@/lib/ai/voice/types";

const TOOL_KEYWORDS = [
  "ordina",
  "riordina",
  "carica",
  "scarica",
  "crea ricetta",
  "nuova ricetta",
  "aggiungi",
  "inserisci",
  "registra",
  "prepara ordine",
  "aggiorna scort",
  "controlla scort",
  "cerca prodotto",
  "aggiungi vino",
  "menu",
  "esegui",
  "fammi",
  "voglio",
] as const;

function applyVoiceBoosts(transcript: string, modules: OrchestratorModuleId[]): OrchestratorModuleId[] {
  const lower = transcript.toLowerCase();
  const boosted = [...modules];

  if (/(copert|coperti|domani|stasera|prenotaz)/.test(lower)) {
    boosted.unshift("prenotazioni");
  }
  if (/(food\s*cost|foodcost|margine|costo)/.test(lower)) {
    boosted.unshift("foodcost");
  }
  if (/(ordina|riordina|pesce|fornitore|scort|magazzino)/.test(lower)) {
    boosted.unshift("inventory");
  }

  return [...new Set(boosted)].slice(0, 4);
}

function ruleBasedVoicePlan(transcript: string, contextHint?: string): VoicePlan {
  const scores = routeQuery(transcript, { contextHint, maxModules: 4 });
  const modules = applyVoiceBoosts(transcript, modulesFromScores(scores));
  const lower = transcript.toLowerCase();
  const enableTools = TOOL_KEYWORDS.some((kw) => lower.includes(kw));
  const primaryContext = ORCHESTRATOR_STREAM_CONTEXT[modules[0] ?? "dashboard"] ?? "risto";

  return {
    modules,
    enableTools: enableTools || primaryContext === "risto",
    primaryContext,
    reasoning: `Voice routing: ${modules.join(", ")}${enableTools ? " + tools" : ""}`,
    source: "rules",
  };
}

export async function planVoiceTurn(
  transcript: string,
  options?: {
    contextHint?: string;
    locale?: string;
    useAi?: boolean;
    signal?: AbortSignal;
    tenantId?: string;
  },
): Promise<VoicePlan> {
  const rulePlan = ruleBasedVoicePlan(transcript, options?.contextHint);
  if (!options?.useAi || !options.tenantId) return rulePlan;

  const routerContext = options.contextHint ?? rulePlan.primaryContext ?? rulePlan.modules[0] ?? "dashboard";
  const runtime = await resolveAgentRuntime(options.tenantId, routerContext);
  if (!runtime.active) return rulePlan;

  const apiKey = resolveProviderApiKey(runtime.provider);
  if (!apiKey) return rulePlan;

  try {
    const { content } = await callLlmChatCompletion(
      runtime.provider,
      apiKey,
      {
        model: runtime.model,
        temperature: Math.min(runtime.temperature, 0.2),
        max_tokens: Math.min(runtime.maxTokens, 300),
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Pianifica turno voice assistant. JSON: {"modules":["..."], "enableTools":boolean, "primaryContext":"risto|cucina|magazzino|...", "reasoning":"..."}',
          },
          {
            role: "user",
            content: `Trascrizione: ${transcript}\nPiano rule-based: ${JSON.stringify(rulePlan)}`,
          },
        ],
      },
      options.signal,
    );

    if (!content) return rulePlan;
    const parsed = JSON.parse(content) as {
      modules?: unknown;
      enableTools?: boolean;
      primaryContext?: string;
      reasoning?: string;
    };

    const aiModules = Array.isArray(parsed.modules)
      ? parsed.modules.filter((m): m is OrchestratorModuleId => typeof m === "string")
      : rulePlan.modules;

    return {
      modules: [...new Set([...aiModules, ...rulePlan.modules])].slice(0, 4),
      enableTools: parsed.enableTools ?? rulePlan.enableTools,
      primaryContext: parsed.primaryContext ?? rulePlan.primaryContext,
      reasoning: parsed.reasoning
        ? `AI: ${parsed.reasoning} | ${rulePlan.reasoning}`
        : rulePlan.reasoning,
      source: "rules+ai",
    };
  } catch {
    return rulePlan;
  }
}

export { ruleBasedVoicePlan, ORCHESTRATOR_STREAM_CONTEXT as MODULE_TO_CONTEXT, TOOL_KEYWORDS };
