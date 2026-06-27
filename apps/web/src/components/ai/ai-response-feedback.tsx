"use client";

import { useState } from "react";
import { Bookmark, Pencil, ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  resultId: string;
  onFeedback: (params: {
    resultId: string;
    useful: boolean;
    correction?: string;
    remember?: boolean;
  }) => Promise<void>;
  compact?: boolean;
};

export function AiResponseFeedback({ resultId, onFeedback, compact }: Props) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"up" | "down" | null>(null);
  const [showCorrect, setShowCorrect] = useState(false);
  const [correction, setCorrection] = useState("");
  const [remember, setRemember] = useState(false);

  const submit = async (useful: boolean, withCorrection = false) => {
    setBusy(true);
    try {
      await onFeedback({
        resultId,
        useful,
        correction: withCorrection ? correction.trim() || undefined : undefined,
        remember: withCorrection ? remember : false,
      });
      setDone(useful ? "up" : "down");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("rounded-xl border border-rw-line bg-rw-surfaceAlt/60", compact ? "p-2" : "p-3")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-rw-muted">Feedback AI</span>
        <button
          type="button"
          disabled={busy || done !== null}
          onClick={() => submit(true)}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition",
            done === "up" ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-emerald-500/10 text-rw-soft",
          )}
          title="Utile"
        >
          <ThumbsUp className="h-3.5 w-3.5" /> Utile
        </button>
        <button
          type="button"
          disabled={busy || done !== null}
          onClick={() => submit(false)}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition",
            done === "down" ? "bg-red-500/20 text-red-400" : "hover:bg-red-500/10 text-rw-soft",
          )}
          title="Non utile"
        >
          <ThumbsDown className="h-3.5 w-3.5" /> Non utile
        </button>
        <button
          type="button"
          onClick={() => setShowCorrect((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rw-soft hover:bg-rw-surface"
          title="Correggi AI"
        >
          <Pencil className="h-3.5 w-3.5" /> Correggi
        </button>
      </div>
      {showCorrect && (
        <div className="mt-2 space-y-2">
          <textarea
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            placeholder="Scrivi la correzione preferita…"
            className="w-full rounded-lg border border-rw-line bg-rw-bg px-3 py-2 text-xs text-rw-ink"
            rows={2}
          />
          <label className="flex items-center gap-2 text-xs text-rw-muted">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Ricorda questa scelta
          </label>
          <button
            type="button"
            disabled={busy || !correction.trim()}
            onClick={() => submit(true, true)}
            className="inline-flex items-center gap-1 rounded-lg bg-rw-accent/15 px-3 py-1.5 text-xs font-semibold text-rw-accent"
          >
            <Bookmark className="h-3.5 w-3.5" /> Salva preferenza
          </button>
        </div>
      )}
    </div>
  );
}
