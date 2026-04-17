"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { aiApi } from "@/lib/api-client";

export type AiMessage = { role: "user" | "assistant"; content: string; ts: number };

type Props = {
  context: string;
  open: boolean;
  onClose: () => void;
  title?: string;
  onAction?: (action: string, data: Record<string, unknown>) => void;
};

export function AiChat({ context, open, onClose, title }: Props) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: AiMessage = { role: "user", content: text, ts: Date.now() };
    setMessages((p) => [...p, userMsg]);
    setLoading(true);

    const history = messages
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    aiApi
      .chat({ context, message: text, history })
      .then((data) => {
        const reply = String(data.reply || "").trim();
        if (!reply) throw new Error("Risposta AI vuota");
        setMessages((p) => [...p, { role: "assistant", content: reply, ts: Date.now() }]);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Errore AI";
        setMessages((p) => [
          ...p,
          {
            role: "assistant",
            content: `AI non disponibile: ${msg}`,
            ts: Date.now(),
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, [input, loading, context, messages]);

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-96 max-w-full flex-col border-l border-rw-line bg-rw-surface shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rw-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-rw-accent" />
          <span className="font-display text-sm font-semibold text-rw-ink">{title || "AI Assistant"}</span>
        </div>
        <button type="button" onClick={onClose} className="text-rw-muted hover:text-rw-ink">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
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
            <div className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
              m.role === "user"
                ? "bg-rw-accent text-white"
                : "border border-rw-line bg-rw-surfaceAlt text-rw-ink",
            )}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-rw-line bg-rw-surfaceAlt px-3.5 py-2.5 text-sm text-rw-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Sto pensando…
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-rw-line px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Scrivi o usa il microfono…"
            className="flex-1 rounded-xl border border-rw-line bg-rw-bg px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent"
          />
          <button type="button" onClick={send} disabled={loading || !input.trim()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-accent text-white transition hover:bg-rw-accent/85 disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
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
