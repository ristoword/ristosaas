"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { consumeAiStream } from "@/lib/ai/consume-ai-stream";
import {
  isSpeechRecognitionSupported,
  listenOnce,
} from "@/lib/ai/voice/speech";
import { isBrowserTtsSupported, speakInBrowser, stopBrowserSpeech } from "@/lib/ai/voice/tts";

export type VoiceMessage = {
  role: "user" | "assistant";
  content: string;
  ts: number;
  streaming?: boolean;
};

type UseVoiceAssistantOptions = {
  locale?: string;
  autoSpeak?: boolean;
  useOpenAiTts?: boolean;
};

export function useVoiceAssistant(options: UseVoiceAssistantOptions = {}) {
  const locale = options.locale ?? "it";
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceSupported] = useState(() => isSpeechRecognitionSupported());
  const listenStopRef = useRef<(() => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const initSession = useCallback(async () => {
    const res = await fetch("/api/ai/voice/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    if (!res.ok) throw new Error("Impossibile avviare sessione voice");
    const data = (await res.json()) as { sessionId: string };
    setSessionId(data.sessionId);
    return data.sessionId;
  }, [locale]);

  useEffect(() => {
    initSession().catch(() => undefined);
    return () => {
      listenStopRef.current?.();
      abortRef.current?.abort();
      stopBrowserSpeech();
    };
  }, [initSession]);

  const speakReply = useCallback(
    async (text: string) => {
      if (!options.autoSpeak) return;

      if (options.useOpenAiTts) {
        try {
          const res = await fetch("/api/ai/voice/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, locale }),
          });
          if (res.ok) {
            const data = (await res.json()) as { audioBase64: string; mimeType: string };
            const audio = new Audio(`data:${data.mimeType};base64,${data.audioBase64}`);
            await audio.play();
            return;
          }
        } catch {
          /* fallback browser */
        }
      }

      if (isBrowserTtsSupported()) speakInBrowser(text, locale);
    },
    [locale, options.autoSpeak, options.useOpenAiTts],
  );

  const sendTranscript = useCallback(
    async (transcript: string) => {
      const trimmed = transcript.trim();
      if (!trimmed || isProcessing) return;

      let sid = sessionId;
      if (!sid) sid = await initSession();

      setIsProcessing(true);
      setInterimTranscript("");
      setMessages((prev) => [...prev, { role: "user", content: trimmed, ts: Date.now() }]);

      const assistantTs = Date.now();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", ts: assistantTs, streaming: true },
      ]);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      let accumulated = "";

      await consumeAiStream(
        "/ai/voice/turn",
        { sessionId: sid, transcript: trimmed, locale, stream: true },
        {
          onStatus: (message) => setStatusText(message),
          onToken: (token) => {
            accumulated += token;
            setMessages((prev) =>
              prev.map((m) =>
                m.ts === assistantTs ? { ...m, content: accumulated, streaming: true } : m,
              ),
            );
          },
          onDone: async (event) => {
            const reply = event.reply ?? accumulated;
            setMessages((prev) =>
              prev.map((m) =>
                m.ts === assistantTs ? { ...m, content: reply, streaming: false } : m,
              ),
            );
            await speakReply(reply);
          },
          onError: (message) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.ts === assistantTs
                  ? { ...m, content: message, streaming: false }
                  : m,
              ),
            );
          },
        },
        controller.signal,
      );

      setIsProcessing(false);
      setStatusText(null);
      abortRef.current = null;
    },
    [sessionId, initSession, locale, isProcessing, speakReply],
  );

  const startListening = useCallback(() => {
    if (!voiceSupported || isListening || isProcessing) return;
    setIsListening(true);
    setInterimTranscript("");

    const handle = listenOnce(locale, {
      onInterim: (text) => setInterimTranscript(text),
      onFinal: (text) => {
        setIsListening(false);
        listenStopRef.current = null;
        void sendTranscript(text);
      },
      onError: () => {
        setIsListening(false);
        listenStopRef.current = null;
      },
    });
    listenStopRef.current = handle.stop;
  }, [voiceSupported, isListening, isProcessing, locale, sendTranscript]);

  const stopListening = useCallback(() => {
    listenStopRef.current?.();
    listenStopRef.current = null;
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const stopProcessing = useCallback(() => {
    abortRef.current?.abort();
    setIsProcessing(false);
    setStatusText(null);
  }, []);

  const resetConversation = useCallback(async () => {
    stopListening();
    stopProcessing();
    setMessages([]);
    await initSession();
  }, [initSession, stopListening, stopProcessing]);

  return {
    sessionId,
    messages,
    isListening,
    isProcessing,
    statusText,
    interimTranscript,
    voiceSupported,
    startListening,
    stopListening,
    sendTranscript,
    stopProcessing,
    resetConversation,
  };
}
