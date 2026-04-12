"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SpeechRecognitionType = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } }; length: number } }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};

function getSpeechRecognition(): SpeechRecognitionType | null {
  if (typeof window === "undefined") return null;
  const W = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionType;
    webkitSpeechRecognition?: new () => SpeechRecognitionType;
  };
  const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}

type Props = {
  onResult: (text: string) => void;
  lang?: string;
  className?: string;
  compact?: boolean;
};

export function VoiceButton({ onResult, lang = "it-IT", className, compact }: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SpeechRecognitionType | null>(null);

  useEffect(() => {
    const r = getSpeechRecognition();
    if (!r) {
      setSupported(false);
      return;
    }
    r.continuous = false;
    r.interimResults = false;
    r.lang = lang;

    r.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      if (last?.[0]?.transcript) {
        onResult(last[0].transcript);
      }
    };

    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);

    recRef.current = r;
  }, [lang, onResult]);

  const toggle = useCallback(() => {
    if (!recRef.current) return;
    if (listening) {
      recRef.current.stop();
    } else {
      recRef.current.start();
      setListening(true);
    }
  }, [listening]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? "Interrompi" : "Comando vocale"}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
        listening
          ? "border-red-500/40 bg-red-500/15 text-red-400 animate-pulse"
          : "border-rw-line bg-rw-surfaceAlt text-rw-soft hover:text-rw-ink hover:border-rw-accent/30",
        compact && "px-2.5 py-2",
        className,
      )}
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      {!compact && (listening ? "Ascoltando…" : "Voce")}
    </button>
  );
}
