import { DEFAULT_MODEL, MAX_TOKENS, TEMPERATURE } from "@/lib/ai/chat-core";
import {
  getModuleDefinition,
  MODULE_STATUS_KEYS,
  normalizeModuleId,
} from "@/lib/ai/modules/config";
import type { ModuleAiRequest, ModuleAiResponse, ModuleId } from "@/lib/ai/modules/types";
import { callOpenAIChatCompletion, streamOpenAIChatCompletion } from "@/lib/ai/openai-stream";
import { createSseResponse, type SseEmitter } from "@/lib/ai/sse";
import { pickStatusMessage } from "@/lib/ai/stream-status";

function buildInsightPrompt(moduleId: ModuleId, focus: string, locale: string) {
  const lang = locale.startsWith("en") ? "English" : "italiano";
  return `Sei l'assistente AI operativo di RistoSimply per il modulo "${moduleId}".
Il tuo compito è interpretare i dati rule-based già calcolati dal gestionale e produrre insight operativi concreti.

Regole:
- NON inventare numeri: usa solo quelli presenti nello snapshot JSON.
- Mantieni la logica rule-based come fonte di verità; tu aggiungi priorità, rischi e azioni suggerite.
- Rispondi in ${lang}, tono professionale da responsabile di reparto.
- Struttura: 1) Sintesi (2-3 righe) 2) Alert/priorità 3) Azioni consigliate (max 5 bullet).
- Focus del modulo: ${focus}.`;
}

async function generateInsights(
  moduleId: ModuleId,
  snapshot: unknown,
  options: { locale?: string; signal?: AbortSignal },
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const def = getModuleDefinition(moduleId);
  const locale = options.locale ?? "it";
  const systemPrompt = buildInsightPrompt(moduleId, def.focus, locale);

  const { content } = await callOpenAIChatCompletion(
    apiKey,
    {
      model: DEFAULT_MODEL,
      temperature: TEMPERATURE,
      max_tokens: Math.min(MAX_TOKENS, 900),
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Snapshot rule-based (JSON):\n${JSON.stringify(snapshot, null, 0).slice(0, 12000)}`,
        },
      ],
    },
    options.signal,
  );

  return content?.trim() || null;
}

async function streamInsights(
  moduleId: ModuleId,
  snapshot: unknown,
  emit: SseEmitter,
  options: { locale?: string; signal?: AbortSignal },
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    emit({ type: "error", message: "OpenAI non configurato" });
    return null;
  }

  const def = getModuleDefinition(moduleId);
  const statusKey = MODULE_STATUS_KEYS[moduleId] ?? "default";
  emit({ type: "status", message: pickStatusMessage(statusKey, 0) });
  emit({ type: "status", message: pickStatusMessage(statusKey, 1) });

  const locale = options.locale ?? "it";
  const systemPrompt = buildInsightPrompt(moduleId, def.focus, locale);

  const { content } = await streamOpenAIChatCompletion(
    apiKey,
    {
      model: DEFAULT_MODEL,
      temperature: TEMPERATURE,
      max_tokens: Math.min(MAX_TOKENS, 900),
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Snapshot rule-based (JSON):\n${JSON.stringify(snapshot, null, 0).slice(0, 12000)}`,
        },
      ],
    },
    (token) => emit({ type: "token", content: token }),
    options.signal,
  );

  return content.trim() || null;
}

export async function runModuleAi(
  moduleSlug: string,
  ctx: { tenantId: string; userId?: string },
  req: ModuleAiRequest = {},
): Promise<ModuleAiResponse | null> {
  const moduleId = normalizeModuleId(moduleSlug);
  if (!moduleId) return null;

  const def = getModuleDefinition(moduleId);
  const snapshot = await def.buildSnapshot({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    periodDays: req.periodDays,
  });

  const generatedAt = new Date().toISOString();
  let insights: string | null = null;

  if (req.enrich) {
    insights = await generateInsights(moduleId, snapshot, { locale: req.locale });
  }

  return {
    module: moduleId,
    generatedAt,
    snapshot,
    insights,
    source: insights ? "rules+ai" : "rules",
  };
}

export function runModuleAiStream(
  moduleSlug: string,
  ctx: { tenantId: string; userId?: string },
  req: ModuleAiRequest,
  reqSignal?: AbortSignal,
): Response | null {
  const moduleId = normalizeModuleId(moduleSlug);
  if (!moduleId) return null;

  return createSseResponse(async (emit, signal) => {
    const def = getModuleDefinition(moduleId);
    const snapshot = await def.buildSnapshot({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      periodDays: req.periodDays,
    });

    const generatedAt = new Date().toISOString();
    emit({
      type: "meta",
      data: { module: moduleId, generatedAt, snapshot, source: "rules" },
    });

    const insights = await streamInsights(moduleId, snapshot, emit, {
      locale: req.locale,
      signal,
    });

    emit({
      type: "done",
      reply: insights ?? undefined,
      source: insights ? "rules+ai" : "rules",
      generatedAt,
    });
  }, reqSignal);
}

export { normalizeModuleId };
