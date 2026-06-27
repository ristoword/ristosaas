import { SPEECH_LOCALE_MAP } from "@/lib/ai/voice/types";

export type SpeechRecognitionHandle = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onspeechend: (() => void) | null;
};

export type SpeechRecognitionEventLike = {
  results: {
    [index: number]: { [index: number]: { transcript: string }; isFinal: boolean };
    length: number;
  };
};

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== "undefined" && Boolean(getSpeechRecognitionConstructor());
}

function getSpeechRecognitionConstructor():
  | (new () => SpeechRecognitionHandle)
  | null {
  if (typeof window === "undefined") return null;
  const W = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionHandle;
    webkitSpeechRecognition?: new () => SpeechRecognitionHandle;
  };
  return W.SpeechRecognition ?? W.webkitSpeechRecognition ?? null;
}

export function createSpeechRecognition(locale = "it"): SpeechRecognitionHandle | null {
  const Ctor = getSpeechRecognitionConstructor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = SPEECH_LOCALE_MAP[locale] ?? SPEECH_LOCALE_MAP.it;
  return rec;
}

export function extractTranscriptFromEvent(
  event: SpeechRecognitionEventLike,
  interim = false,
): { transcript: string; isFinal: boolean } {
  let transcript = "";
  let isFinal = false;
  for (let i = 0; i < event.results.length; i++) {
    const result = event.results[i];
    transcript += result[0]?.transcript ?? "";
    if (result.isFinal) isFinal = true;
  }
  if (!interim && !isFinal && event.results.length > 0) {
    const last = event.results[event.results.length - 1];
    isFinal = last.isFinal;
  }
  return { transcript: transcript.trim(), isFinal };
}

export function listenOnce(
  locale: string,
  handlers: {
    onInterim?: (text: string) => void;
    onFinal: (text: string) => void;
    onError?: (error: string) => void;
  },
): { stop: () => void } {
  const rec = createSpeechRecognition(locale);
  if (!rec) {
    handlers.onError?.("Speech recognition non supportato");
    return { stop: () => undefined };
  }

  rec.onresult = (event) => {
    const { transcript, isFinal } = extractTranscriptFromEvent(event, true);
    if (!transcript) return;
    if (isFinal) handlers.onFinal(transcript);
    else handlers.onInterim?.(transcript);
  };

  rec.onerror = (event) => handlers.onError?.(event.error);
  rec.onend = () => undefined;

  try {
    rec.start();
  } catch (e) {
    handlers.onError?.(e instanceof Error ? e.message : "Errore avvio microfono");
  }

  return {
    stop: () => {
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
    },
  };
}
