"use client";

import { useCallback, useRef, useState } from "react";
import { consumeAiStream } from "@/lib/ai/consume-ai-stream";

export type AiStreamMessage = {
  role: "user" | "assistant";
  content: string;
  ts: number;
  isAction?: boolean;
  streaming?: boolean;
};

type ChatStreamPayload = {
  context: string;
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  enableTools?: boolean;
  locale?: string;
};

export function useAiStreamChat() {
  const [statusText, setStatusText] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setStatusText(null);
  }, []);

  const streamChat = useCallback(
    async (
      payload: ChatStreamPayload,
      onAssistantUpdate: (fullText: string) => void,
      onComplete: (result: { reply: string; actions?: string[] }) => void,
      onError: (message: string) => void,
    ) => {
      stop();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);
      setStatusText("AI sta analizzando…");

      let accumulated = "";

      await consumeAiStream(
        "/ai/chat",
        payload,
        {
          onStatus: (message) => setStatusText(message),
          onToken: (token) => {
            accumulated += token;
            onAssistantUpdate(accumulated);
          },
          onDone: (event) => {
            const reply = event.reply ?? accumulated;
            onComplete({ reply, actions: event.actions });
          },
          onError: (message) => onError(message),
        },
        controller.signal,
      );

      setIsStreaming(false);
      setStatusText(null);
      abortRef.current = null;
    },
    [stop],
  );

  return { streamChat, stop, isStreaming, statusText };
}

export function useAiStreamText() {
  const [statusText, setStatusText] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [text, setText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setStatusText(null);
  }, []);

  const streamFrom = useCallback(
    async (
      path: string,
      body: Record<string, unknown>,
      handlers?: {
        onMeta?: (data: Record<string, unknown>) => void;
        onComplete?: (full: string) => void;
        onError?: (message: string) => void;
      },
    ) => {
      stop();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);
      setText("");
      setStatusText("AI sta analizzando…");

      let accumulated = "";

      await consumeAiStream(
        path,
        body,
        {
          onStatus: (message) => setStatusText(message),
          onMeta: (data) => handlers?.onMeta?.(data),
          onToken: (token) => {
            accumulated += token;
            setText(accumulated);
          },
          onDone: (event) => {
            const full =
              event.reply ??
              event.report ??
              event.narrative ??
              accumulated;
            setText(full);
            handlers?.onComplete?.(full);
          },
          onError: (message) => handlers?.onError?.(message),
        },
        controller.signal,
      );

      setIsStreaming(false);
      setStatusText(null);
      abortRef.current = null;
    },
    [stop],
  );

  return { streamFrom, stop, isStreaming, statusText, text, setText };
}
