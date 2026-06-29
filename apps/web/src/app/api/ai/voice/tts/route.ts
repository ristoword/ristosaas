import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { synthesizeOpenAiSpeech } from "@/lib/ai/voice/tts";
import { isVoiceRuntimeEnabled, isAiFeatureEnabled } from "@/lib/ai/platform-config.runtime";

const VOICE_ROLES = [
  "owner",
  "supervisor",
  "cucina",
  "magazzino",
  "sala",
  "bar",
  "pizzeria",
  "cassa",
  "hotel_manager",
  "reception",
  "housekeeping",
  "super_admin",
] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, VOICE_ROLES);
  if (guard.error) return guard.error;

  if (!(await isAiFeatureEnabled("master")) || !(await isVoiceRuntimeEnabled())) {
    return err("Voice AI disattivato dalla piattaforma", 503);
  }

  const payload = await body<{ text?: string; locale?: string }>(req);
  if (!payload.text?.trim()) return err("text obbligatorio", 400);

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return err("OPENAI_API_KEY non configurata", 503);

  try {
    const audio = await synthesizeOpenAiSpeech({
      apiKey,
      text: payload.text,
      locale: payload.locale ?? "it",
      signal: req.signal,
    });
    return ok(audio);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Errore TTS", 502);
  }
}
