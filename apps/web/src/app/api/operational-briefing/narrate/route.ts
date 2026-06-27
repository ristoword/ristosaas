import { NextRequest } from "next/server";
import { ok, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import {
  buildBriefingNarrative,
  operationalBriefingRepository,
} from "@/lib/db/repositories/operational-briefing.repository";
import { createSseResponse } from "@/lib/ai/sse";
import { streamOpenAIChatCompletion } from "@/lib/ai/openai-stream";
import { pickStatusMessage } from "@/lib/ai/stream-status";

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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || payload.enhance === false) {
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

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const systemContent = `Sei Risto, l'assistente vocale di RistoSimply. Devi leggere ad alta voce un briefing operativo del giorno.
Rispondi in ${langName}, in tono professionale ma amichevole, come un briefing mattutino al team.
Struttura: saluto → prenotazioni e coperti → staff presente → comande attive e da preparare → magazzino e ordini in attesa → cose da fare → hotel (se presente) → chiusura breve.
Usa SOLO i dati JSON forniti. Non inventare numeri. Massimo 250 parole. Scrivi testo fluido da leggere ad alta voce, senza elenchi puntati né markdown.`;

  const userContent = `Dati operativi di oggi:\n${JSON.stringify(briefing, null, 2)}`;

  if (payload.stream) {
    return createSseResponse(async (emit, signal) => {
      emit({ type: "meta", data: { briefing } });
      emit({ type: "status", message: pickStatusMessage("briefing", 0) });
      emit({ type: "status", message: pickStatusMessage("briefing", 1) });
      emit({ type: "status", message: pickStatusMessage("briefing", 2) });

      try {
        let narrative = "";
        const result = await streamOpenAIChatCompletion(
          apiKey,
          {
            model,
            temperature: 0.5,
            max_tokens: 900,
            messages: [
              { role: "system", content: systemContent },
              { role: "user", content: userContent },
            ],
          },
          (token) => {
            narrative += token;
            emit({ type: "token", content: token });
          },
          signal,
        );
        narrative = result.content.trim() || fallbackNarrative;
        emit({ type: "done", narrative, source: "ai", briefing });
      } catch {
        emit({ type: "token", content: fallbackNarrative });
        emit({ type: "done", narrative: fallbackNarrative, source: "template", briefing });
      }
    }, req.signal);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        max_tokens: 900,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: userContent },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      return ok({ briefing, narrative: fallbackNarrative, source: "template" });
    }

    const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const narrative = json.choices?.[0]?.message?.content?.trim() || fallbackNarrative;

    return ok({ briefing, narrative, source: "ai" });
  } catch {
    return ok({ briefing, narrative: fallbackNarrative, source: "template" });
  }
}
