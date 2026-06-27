"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, Sparkles, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
import { useAiStreamChat } from "@/hooks/use-ai-stream";

export type AiMessage = { role: "user" | "assistant"; content: string; ts: number; streaming?: boolean };

type Props = {
  context: string;
  open: boolean;
  onClose: () => void;
  title?: string;
  locale?: string;
  onAction?: (action: string, data: Record<string, unknown>) => void;
};

function StreamingCursor() {
  return <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-rw-accent align-middle" />;
}

export function AiChat({ context, open, onClose, title, locale: localeProp }: Props) {
  const i18n = useI18n();
  const locale = localeProp || i18n.locale;
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const { streamChat, stop, isStreaming, statusText } = useAiStreamChat();

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, statusText]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");

    const userMsg: AiMessage = { role: "user", content: text, ts: Date.now() };
    const assistantTs = Date.now() + 1;
    const history = messages
      .filter((m) => !m.streaming)
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((p) => [
      ...p,
      userMsg,
      { role: "assistant", content: "", ts: assistantTs, streaming: true },
    ]);

    void streamChat(
      { context, message: text, history, locale },
      (fullText) => {
        setMessages((p) =>
          p.map((m) =>
            m.ts === assistantTs ? { ...m, content: fullText } : m,
          ),
        );
      },
      ({ reply }) => {
        setMessages((p) =>
          p.map((m) =>
            m.ts === assistantTs
              ? { role: "assistant", content: reply, ts: assistantTs, streaming: false }
              : m,
          ),
        );
      },
      (msg) => {
        setMessages((p) =>
          p.map((m) =>
            m.ts === assistantTs
              ? { role: "assistant", content: `AI non disponibile: ${msg}`, ts: assistantTs, streaming: false }
              : m,
          ),
        );
      },
    );
  }, [input, isStreaming, context, messages, locale, streamChat]);

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-96 max-w-full flex-col border-l border-rw-line bg-rw-surface shadow-2xl">
      <div className="flex items-center justify-between border-b border-rw-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-rw-accent" />
          <span className="font-display text-sm font-semibold text-rw-ink">{title || "AI Assistant"}</span>
        </div>
        <button type="button" onClick={onClose} className="text-rw-muted hover:text-rw-ink">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-rw-muted">
            <Bot className="h-10 w-10 opacity-30" />
            <p className="text-sm">Chiedimi qualsiasi cosa.</p>
            <p className="text-xs">Posso aiutarti con analisi, suggerimenti e operazioni.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.ts} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-rw-accent text-white"
                  : "border border-rw-line bg-rw-surfaceAlt text-rw-ink",
              )}
            >
              {m.content}
              {m.streaming && m.content.length > 0 && <StreamingCursor />}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl border border-rw-accent/20 bg-rw-accent/5 px-3.5 py-2.5 text-xs text-rw-muted">
              {statusText || "AI sta analizzando…"}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-rw-line px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Scrivi un messaggio…"
            disabled={isStreaming}
            className="flex-1 rounded-xl border border-rw-line bg-rw-bg px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent disabled:opacity-60"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              title="Interrompi"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 transition hover:bg-red-500/20"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={send}
              disabled={!input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-accent text-white transition hover:bg-rw-accent/85 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AiToggleButton({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-xl border border-rw-accent/30 bg-rw-accent/10 px-4 py-2.5 text-sm font-semibold text-rw-accent transition hover:bg-rw-accent/20">
      <Sparkles className="h-4 w-4" /> {label || "AI Assistant"}
    </button>
  );
}
