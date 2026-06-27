import { SPEECH_LOCALE_MAP, TTS_VOICE_MAP } from "@/lib/ai/voice/types";

const DEFAULT_TTS_MODEL = process.env.OPENAI_TTS_MODEL?.trim() || "tts-1";

export function isBrowserTtsSupported(): boolean {
  return typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";
}

export function speakInBrowser(text: string, locale = "it"): void {
  if (!isBrowserTtsSupported()) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = SPEECH_LOCALE_MAP[locale] ?? SPEECH_LOCALE_MAP.it;
  utter.rate = 1;
  utter.pitch = 1;
  window.speechSynthesis.speak(utter);
}

export function stopBrowserSpeech(): void {
  if (isBrowserTtsSupported()) {
    window.speechSynthesis.cancel();
  }
}

export async function synthesizeOpenAiSpeech(params: {
  apiKey: string;
  text: string;
  locale?: string;
  signal?: AbortSignal;
}): Promise<{ audioBase64: string; mimeType: string; voice: string }> {
  const locale = params.locale ?? "it";
  const voice = TTS_VOICE_MAP[locale] ?? TTS_VOICE_MAP.it;
  const trimmed = params.text.trim().slice(0, 4096);
  if (!trimmed) throw new Error("Testo TTS vuoto");

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_TTS_MODEL,
      input: trimmed,
      voice,
      response_format: "mp3",
    }),
    signal: params.signal ?? AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI TTS error: ${errText || response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const audioBase64 = Buffer.from(buffer).toString("base64");
  return { audioBase64, mimeType: "audio/mpeg", voice };
}

export async function speakWithFallback(
  text: string,
  options?: { locale?: string; preferOpenAi?: boolean; apiKey?: string },
): Promise<{ mode: "browser" | "openai" | "none" }> {
  if (options?.preferOpenAi && options.apiKey) {
    try {
      await synthesizeOpenAiSpeech({
        apiKey: options.apiKey,
        text,
        locale: options.locale,
      });
      return { mode: "openai" };
    } catch {
      /* fallback browser */
    }
  }

  if (isBrowserTtsSupported()) {
    speakInBrowser(text, options?.locale);
    return { mode: "browser" };
  }

  return { mode: "none" };
}
