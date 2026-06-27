import { DEFAULT_MODEL, MAX_TOKENS, TEMPERATURE } from "@/lib/ai/chat-core";
import { callOpenAIChatCompletion, streamOpenAIChatCompletion } from "@/lib/ai/openai-stream";
import { augmentSystemPrompt } from "@/lib/ai/memory/context-manager";
import { getModuleDefinition } from "@/lib/ai/modules/config";
import type { SseEmitter } from "@/lib/ai/sse";
import { pickStatusMessage } from "@/lib/ai/stream-status";
import { formatContextForPrompt } from "@/lib/ai/orchestrator/context";
import type {
  OrchestratorContext,
  OrchestratorModuleResult,
  OrchestratorPlan,
  OrchestratorResponse,
} from "@/lib/ai/orchestrator/types";

function summarizeSnapshot(module: OrchestratorModuleResult): string {
  const def = getModuleDefinition(module.moduleId);
  const snapshotStr = JSON.stringify(module.snapshot ?? {}, null, 0).slice(0, 2500);
  const insight = module.insights ? `\nInsight AI modulo: ${module.insights.slice(0, 500)}` : "";
  return `### ${def.id.toUpperCase()} (${def.focus})\nDati rule-based: ${snapshotStr}${insight}`;
}

export function unifyRuleBasedResponse(
  query: string,
  plan: OrchestratorPlan,
  modules: OrchestratorModuleResult[],
  ctx: OrchestratorContext,
): string {
  const sections = modules.map(summarizeSnapshot);
  const errors = modules.filter((m) => m.error).map((m) => `- ${m.module}: ${m.error}`);

  return [
    `**Risposta operativa RistoSimply** (rule-based fallback)`,
    ``,
    `**Domanda:** ${query}`,
    ``,
    `**Moduli consultati:** ${plan.modules.join(", ")}`,
    plan.reasoning ? `**Piano:** ${plan.reasoning}` : "",
    ``,
    ...sections,
    errors.length ? `\n**Avvisi:**\n${errors.join("\n")}` : "",
    ``,
    `_Dati calcolati dal motore rule-based del gestionale. Layer AI non disponibile o disabilitato._`,
    ctx.ragContext ? `\n_Documentazione manuale consultata via RAG._` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSynthesisPrompt(
  query: string,
  plan: OrchestratorPlan,
  modules: OrchestratorModuleResult[],
  ctx: OrchestratorContext,
): { system: string; user: string } {
  const lang = ctx.locale.startsWith("en") ? "English" : "italiano";
  const moduleData = modules
    .map((m) => ({
      module: m.module,
      source: m.source,
      error: m.error,
      snapshot: m.snapshot,
      insights: m.insights,
    }))
    .slice(0, 5);

  const systemBase = `Sei l'orchestratore centrale AI di RistoSimply.
Unifica i dati di più moduli in UNA risposta coerente per il team operativo.

Regole:
- I dati rule-based negli snapshot sono la fonte di verità (fallback di sicurezza).
- NON inventare numeri assenti dagli snapshot.
- Rispondi in ${lang}, tono professionale e actionable.
- Struttura: 1) Sintesi 2) Per reparto (solo moduli rilevanti) 3) Priorità/alert 4) Azioni consigliate.
- Se moduli hanno dati contrastanti, segnala e preferisci i dati rule-based.`;

  return {
    system: systemBase,
    user: [
      formatContextForPrompt(ctx),
      `Domanda utente: ${query}`,
      `Piano moduli: ${JSON.stringify(plan)}`,
      `Dati moduli (JSON): ${JSON.stringify(moduleData, null, 0).slice(0, 14000)}`,
    ].join("\n\n"),
  };
}

async function buildSynthesisMessages(
  query: string,
  plan: OrchestratorPlan,
  modules: OrchestratorModuleResult[],
  ctx: OrchestratorContext,
): Promise<Array<{ role: "system" | "user"; content: string }>> {
  const { system, user } = buildSynthesisPrompt(query, plan, modules, ctx);
  let systemWithMemory = system;

  if (ctx.userId) {
    systemWithMemory = await augmentSystemPrompt(system, {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      query,
      context: "orchestrator",
      channel: "orchestrator",
      locale: ctx.locale,
    });
  }

  return [
    { role: "system", content: systemWithMemory },
    { role: "user", content: user },
  ];
}

export async function unifyAiResponse(
  query: string,
  plan: OrchestratorPlan,
  modules: OrchestratorModuleResult[],
  ctx: OrchestratorContext,
  signal?: AbortSignal,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return unifyRuleBasedResponse(query, plan, modules, ctx);
  }

  const messages = await buildSynthesisMessages(query, plan, modules, ctx);

  try {
    const { content } = await callOpenAIChatCompletion(
      apiKey,
      {
        model: DEFAULT_MODEL,
        temperature: TEMPERATURE,
        max_tokens: Math.min(MAX_TOKENS, 1400),
        messages,
      },
      signal,
    );

    return content?.trim() || unifyRuleBasedResponse(query, plan, modules, ctx);
  } catch {
    return unifyRuleBasedResponse(query, plan, modules, ctx);
  }
}

export async function streamUnifiedResponse(
  query: string,
  plan: OrchestratorPlan,
  modules: OrchestratorModuleResult[],
  ctx: OrchestratorContext,
  emit: SseEmitter,
  signal?: AbortSignal,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  emit({
    type: "meta",
    data: {
      plan,
      modules: modules.map((m) => ({ module: m.module, source: m.source, error: m.error })),
      ragUsed: Boolean(ctx.ragContext),
    },
  });

  emit({ type: "status", message: pickStatusMessage("briefing", 0) });
  emit({ type: "status", message: pickStatusMessage("briefing", 2) });

  if (!apiKey) {
    const fallback = unifyRuleBasedResponse(query, plan, modules, ctx);
    emit({ type: "token", content: fallback });
    return fallback;
  }

  const messages = await buildSynthesisMessages(query, plan, modules, ctx);

  try {
    const { content } = await streamOpenAIChatCompletion(
      apiKey,
      {
        model: DEFAULT_MODEL,
        temperature: TEMPERATURE,
        max_tokens: Math.min(MAX_TOKENS, 1400),
        messages,
      },
      (token) => emit({ type: "token", content: token }),
      signal,
    );

    return content.trim() || unifyRuleBasedResponse(query, plan, modules, ctx);
  } catch {
    const fallback = unifyRuleBasedResponse(query, plan, modules, ctx);
    emit({ type: "token", content: fallback });
    return fallback;
  }
}

export function buildOrchestratorResponse(params: {
  query: string;
  plan: OrchestratorPlan;
  modules: OrchestratorModuleResult[];
  ctx: OrchestratorContext;
  reply: string;
  source: "rules" | "rules+ai";
}): OrchestratorResponse {
  return {
    reply: params.reply,
    generatedAt: new Date().toISOString(),
    plan: params.plan,
    modules: params.modules,
    ragUsed: Boolean(params.ctx.ragContext),
    source: params.source,
  };
}
