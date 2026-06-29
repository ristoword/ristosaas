import { NextRequest } from "next/server";
import { ok, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import {
  buildBriefingNarrative,
  operationalBriefingRepository,
} from "@/lib/db/repositories/operational-briefing.repository";
import { createSseResponse } from "@/lib/ai/sse";
import { pickStatusMessage } from "@/lib/ai/stream-status";
import { resolveAgentWithPrompts } from "@/lib/ai/runtime/agent-resolver";
import { callLlmChatCompletion, resolveProviderApiKey, streamLlmChatCompletion } from "@/lib/ai/runtime/llm-provider";
import { buildTelemetry, logAiRequest, usageFromOpenAi } from "@/lib/ai/runtime/telemetry";

const BRIEFING_CONTEXT = "dashboard";

const BRIEFING_ROLES = [
  "owner", "supervisor", "sala", "cucina", "bar", "pizzeria", "cassa", "magazzino",
  "super_admin", "hotel_manager", "reception", "housekeeping",
] as const;

const LANG_NAMES: Record<string, string> = { it: "italiano", en: "English", nl: "Nederlands", pt: "português" };

/** POST /api/operational-briefing/narrate — briefing narrato con AI (fallback deterministico) */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, BRIEFING_ROLES);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const payload = await body<{ locale?: string; enhance?: boolean; stream?: boolean }>(req).catch(
    () => ({} as { locale?: string; enhance?: boolean; stream?: boolean }),
  );
  const locale = (payload.locale || "it").trim().toLowerCase();
  const langName = LANG_NAMES[locale] || LANG_NAMES.it;

  const briefing = await operationalBriefingRepository.build(tenantId, guard.user.id);
  const fallbackNarrative = buildBriefingNarrative(briefing);

  if (payload.enhance === false) {
    const result = { briefing, narrative: fallbackNarrative, source: "template" as const };
    if (payload.stream) {
      return createSseResponse(async (emit) => {
        emit({ type: "meta", data: { briefing, source: "template" } });
        emit({ type: "token", content: fallbackNarrative });
        emit({ type: "done", narrative: fallbackNarrative, source: "template", briefing });
      }, req.signal);
    }
    return ok(result);
  }

  const startedAt = Date.now();
  const { runtime, prompts } = await resolveAgentWithPrompts(tenantId, BRIEFING_CONTEXT);
  const providerApiKey = resolveProviderApiKey(runtime.provider);

  if (!providerApiKey || !runtime.active) {
    const result = { briefing, narrative: fallbackNarrative, source: "template" as const };
    if (payload.stream) {
      return createSseResponse(async (emit) => {
        emit({ type: "meta", data: { briefing, source: "template" } });
        emit({ type: "token", content: fallbackNarrative });
        emit({ type: "done", narrative: fallbackNarrative, source: "template", briefing });
      }, req.signal);
    }
    return ok(result);
  }

  let systemContent =
    prompts.systemPrompt.trim() ||
    `Sei Risto, l'assistente vocale di RistoSimply. Devi leggere ad alta voce un briefing operativo del giorno.
Rispondi in ${langName}, in tono professionale ma amichevole, come un briefing mattutino al team.
Struttura: saluto → prenotazioni e coperti → staff presente → comande attive e da preparare → magazzino e ordini in attesa → cose da fare → hotel (se presente) → chiusura breve.
Usa SOLO i dati JSON forniti. Non inventare numeri. Massimo 250 parole. Scrivi testo fluido da leggere ad alta voce, senza elenchi puntati né markdown.`;

  if (prompts.userPrompt.trim()) {
    systemContent = `${systemContent}\n\n${prompts.userPrompt.trim()}`;
  }

  const userContent = `Dati operativi di oggi:\n${JSON.stringify(briefing, null, 2)}`;
  const llmBody = {
    model: runtime.model,
    temperature: Math.min(runtime.temperature, 0.5),
    max_tokens: Math.min(runtime.maxTokens, 900),
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: userContent },
    ],
  };

  if (payload.stream) {
    if (!runtime.streamingEnabled) {
      return createSseResponse(async (emit) => {
        emit({ type: "meta", data: { briefing, source: "template" } });
        emit({ type: "token", content: fallbackNarrative });
        emit({ type: "done", narrative: fallbackNarrative, source: "template", briefing });
      }, req.signal);
    }

    return createSseResponse(async (emit, signal) => {
      emit({ type: "meta", data: { briefing } });
      emit({ type: "status", message: pickStatusMessage("briefing", 0) });
      emit({ type: "status", message: pickStatusMessage("briefing", 1) });
      emit({ type: "status", message: pickStatusMessage("briefing", 2) });

      try {
        let narrative = "";
        const result = await streamLlmChatCompletion(
          runtime.provider,
          providerApiKey,
          llmBody,
          (token) => {
            narrative += token;
            emit({ type: "token", content: token });
          },
          signal,
        );
        narrative = result.content.trim() || fallbackNarrative;

        const tokens = usageFromOpenAi(result.usage, userContent, narrative);
        await logAiRequest({
          tenantId,
          userId: guard.user.id,
          context: BRIEFING_CONTEXT,
          userMessage: "Briefing narrato",
          assistantMessage: narrative,
          telemetry: buildTelemetry({
            runtime,
            ...tokens,
            durationMs: Date.now() - startedAt,
            ragUsed: false,
            ragDocumentsCount: 0,
          }),
        });

        emit({ type: "done", narrative, source: "ai", briefing });
      } catch {
        emit({ type: "token", content: fallbackNarrative });
        emit({ type: "done", narrative: fallbackNarrative, source: "template", briefing });
      }
    }, req.signal);
  }

  try {
    const { content, usage } = await callLlmChatCompletion(
      runtime.provider,
      providerApiKey,
      llmBody,
      AbortSignal.timeout(25_000),
    );

    const narrative = content?.trim() || fallbackNarrative;

    const tokens = usageFromOpenAi(usage, userContent, narrative);
    await logAiRequest({
      tenantId,
      userId: guard.user.id,
      context: BRIEFING_CONTEXT,
      userMessage: "Briefing narrato",
      assistantMessage: narrative,
      telemetry: buildTelemetry({
        runtime,
        ...tokens,
        durationMs: Date.now() - startedAt,
        ragUsed: false,
        ragDocumentsCount: 0,
      }),
    });

    return ok({ briefing, narrative, source: narrative === fallbackNarrative ? "template" : "ai" });
  } catch {
    return ok({ briefing, narrative: fallbackNarrative, source: "template" });
  }
}
