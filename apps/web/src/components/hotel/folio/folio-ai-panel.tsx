"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Send,
  Sparkles,
  Square,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { consumeAiStream } from "@/lib/ai/consume-ai-stream";
import { VoiceButton } from "@/components/ai/ai-voice";
import { hotelFolioAiApi, type FolioAiAnalysis, type FolioAiProposedAction } from "@/lib/api-client";
import type { Customer, GuestFolio, HotelReservation } from "@/lib/api-client";

type AiMessage = { role: "user" | "assistant"; content: string; ts: number; streaming?: boolean };

type Props = {
  folio: GuestFolio;
  reservation: HotelReservation | null;
  customer: Customer | null;
  locale?: string;
  onOpenPayment?: () => void;
  onCheckout?: () => void;
  onExportPdf?: () => void;
  onEmail?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onAnalysis?: (analysis: FolioAiAnalysis) => void;
};

const QUICK_PROMPTS = [
  "Quanto deve ancora pagare?",
  "Ci sono anomalie?",
  "Mostrami tutti gli addebiti del ristorante.",
  "Quali servizi posso proporre?",
  "Perché il saldo è diverso?",
];

export function FolioAiPanel({
  folio,
  reservation,
  customer,
  locale = "it",
  onOpenPayment,
  onCheckout,
  onExportPdf,
  onEmail,
  collapsed,
  onToggleCollapse,
  onAnalysis,
}: Props) {
  const [analysis, setAnalysis] = useState<FolioAiAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<"overview" | "chat" | "checkout">("overview");
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const loadAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await hotelFolioAiApi.analyze(folio.id, locale);
      setAnalysis(result);
      onAnalysis?.(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analisi AI non disponibile");
    } finally {
      setLoading(false);
    }
  }, [folio.id, locale, onAnalysis]);

  useEffect(() => {
    void loadAnalysis();
  }, [loadAnalysis]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, statusText]);

  const sendChat = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;
      setInput("");
      setSection("chat");

      const userMsg: AiMessage = { role: "user", content: trimmed, ts: Date.now() };
      const assistantTs = Date.now() + 1;
      const history = messages
        .filter((m) => !m.streaming)
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((p) => [...p, userMsg, { role: "assistant", content: "", ts: assistantTs, streaming: true }]);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      setStatusText("AI sta analizzando il folio…");

      let accumulated = "";
      await consumeAiStream(
        `/hotel/folio/${folio.id}/ai/chat`,
        { message: trimmed, history, locale },
        {
          onStatus: (msg) => setStatusText(msg),
          onToken: (token) => {
            accumulated += token;
            setMessages((p) => p.map((m) => (m.ts === assistantTs ? { ...m, content: accumulated } : m)));
          },
          onDone: (event) => {
            const reply = event.reply ?? accumulated;
            setMessages((p) =>
              p.map((m) => (m.ts === assistantTs ? { role: "assistant", content: reply, ts: assistantTs, streaming: false } : m)),
            );
          },
          onError: (msg) => {
            setMessages((p) =>
              p.map((m) =>
                m.ts === assistantTs
                  ? { role: "assistant", content: `Errore: ${msg}`, ts: assistantTs, streaming: false }
                  : m,
              ),
            );
          },
        },
        controller.signal,
      );

      setStreaming(false);
      setStatusText(null);
      abortRef.current = null;
    },
    [streaming, messages, folio.id, locale],
  );

  const handleVoice = useCallback(
    (text: string) => {
      const lower = text.toLowerCase();
      if (lower.includes("registra pagamento") || lower.includes("pagamento")) {
        onOpenPayment?.();
        return;
      }
      if (lower.includes("checkout") || lower.includes("chiudi il conto") || lower.includes("chiudi conto")) {
        onCheckout?.();
        return;
      }
      if (lower.includes("saldo") || lower.includes("mostra il saldo")) {
        void sendChat("Qual è il saldo attuale del folio?");
        return;
      }
      if (lower.includes("apri il folio") || lower.includes("folio")) {
        setSection("overview");
        return;
      }
      void sendChat(text);
    },
    [onOpenPayment, onCheckout, sendChat],
  );

  const executeAction = async (action: FolioAiProposedAction) => {
    if (!confirm(`Confermi: ${action.label}?\n\n${action.description}`)) return;
    try {
      await hotelFolioAiApi.confirmAction(folio.id, action.id, action.type);
      if (action.type === "payment") onOpenPayment?.();
      else if (action.type === "checkout") onCheckout?.();
      else if (action.type === "pdf") onExportPdf?.();
      else if (action.type === "email") onEmail?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Azione non eseguita");
    }
  };

  const handleReport = async () => {
    try {
      const blob = await hotelFolioAiApi.downloadReport(folio.id, "pdf");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `folio-ai-report-${folio.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report non disponibile");
    }
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-xl border border-r-0 border-rw-accent/30 bg-rw-accent/10 px-2 py-4 text-rw-accent shadow-lg hover:bg-rw-accent/20"
        title="Apri AI Folio"
      >
        <Sparkles className="h-5 w-5" />
        <span className="text-[10px] font-semibold [writing-mode:vertical-rl]">AI</span>
      </button>
    );
  }

  return (
    <aside className="flex h-full w-full min-w-[320px] max-w-[400px] flex-col border-l border-rw-line bg-rw-surface shadow-xl lg:sticky lg:top-4 lg:h-[calc(100vh-6rem)] lg:rounded-2xl lg:border">
      <div className="flex items-center justify-between border-b border-rw-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-rw-accent" />
          <div>
            <p className="font-display text-sm font-semibold text-rw-ink">AI Folio Concierge</p>
            <p className="text-[10px] text-rw-muted">{folio.guestName ?? "Ospite"} · € {folio.balance.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => void loadAnalysis()} className="rounded-lg p-1.5 text-rw-muted hover:bg-rw-surfaceAlt hover:text-rw-ink" title="Rianalizza">
            <Loader2 className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          {onToggleCollapse && (
            <button type="button" onClick={onToggleCollapse} className="rounded-lg p-1.5 text-rw-muted hover:text-rw-ink">
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-rw-line px-2 py-2">
        {(["overview", "chat", "checkout"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSection(s)}
            className={cn(
              "flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold capitalize",
              section === s ? "bg-rw-accent/15 text-rw-accent" : "text-rw-muted hover:text-rw-ink",
            )}
          >
            {s === "overview" ? "Panoramica" : s === "chat" ? "Chat" : "Checkout"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading && !analysis && (
          <div className="flex flex-col items-center gap-2 py-8 text-rw-muted">
            <Loader2 className="h-8 w-8 animate-spin opacity-50" />
            <p className="text-sm">Analisi automatica folio…</p>
          </div>
        )}

        {error && <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

        {analysis && section === "overview" && (
          <div className="space-y-3">
            <SummaryCard title="Riepilogo soggiorno" text={analysis.guestSummary.stayOverview} />
            {analysis.guestSummary.vip && (
              <span className="inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">VIP</span>
            )}
            {analysis.guestSummary.allergies.length > 0 && (
              <SummaryCard title="Allergie" text={analysis.guestSummary.allergies.join(", ")} warn />
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <MiniStat label="Spesa" value={`€ ${analysis.guestSummary.spending.total.toFixed(0)}`} />
              <MiniStat label="Saldo" value={`€ ${analysis.guestSummary.spending.balance.toFixed(2)}`} highlight={analysis.guestSummary.spending.balance > 0} />
              <MiniStat label="Pagato" value={`€ ${analysis.guestSummary.spending.paid.toFixed(0)}`} />
              <MiniStat label="Ritorno" value={`${Math.round(analysis.customerInsights.returnProbability * 100)}%`} />
            </div>

            {analysis.anomalies.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-rw-ink">Anomalie ({analysis.anomalies.length})</p>
                {analysis.anomalies.slice(0, 5).map((a) => (
                  <AnomalyChip key={a.id} severity={a.severity} title={a.title} detail={a.detail} />
                ))}
              </div>
            )}

            {analysis.revenueSuggestions.length > 0 && (
              <div className="space-y-2">
                <p className="flex items-center gap-1 text-xs font-semibold text-rw-ink">
                  <TrendingUp className="h-3.5 w-3.5 text-rw-accent" /> Revenue suggestions
                </p>
                {analysis.revenueSuggestions.slice(0, 4).map((s) => (
                  <div key={s.id} className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs">
                    <p className="font-semibold text-rw-ink">{s.service}</p>
                    <p className="text-rw-muted">{s.reason}</p>
                  </div>
                ))}
              </div>
            )}

            {analysis.fraudAlerts.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-amber-400">Fraud detection</p>
                {analysis.fraudAlerts.map((f) => (
                  <p key={f.id} className="text-[11px] text-rw-soft">{f.detail}</p>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 text-xs">
              <p className="font-semibold text-rw-ink">Forecast</p>
              <p className="text-rw-muted">Spesa prevista: € {analysis.forecast.projectedFinalSpend.toFixed(0)}</p>
              <p className="text-rw-muted">Ricavo stimato: € {analysis.forecast.estimatedRevenue.toFixed(0)}</p>
            </div>

            {analysis.proposedActions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-rw-ink">Azioni suggerite</p>
                {analysis.proposedActions.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => void executeAction(a)}
                    className="w-full rounded-xl border border-rw-accent/30 bg-rw-accent/5 px-3 py-2 text-left text-xs hover:bg-rw-accent/10"
                  >
                    <p className="font-semibold text-rw-accent">{a.label}</p>
                    <p className="text-rw-muted">{a.description}</p>
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleReport()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-rw-line px-3 py-2 text-xs font-semibold text-rw-ink hover:border-rw-accent/40"
            >
              <Download className="h-3.5 w-3.5" /> Report AI PDF
            </button>
          </div>
        )}

        {section === "chat" && (
          <div className="flex h-full flex-col">
            <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto pb-2">
              {messages.length === 0 && (
                <div className="py-6 text-center text-rw-muted">
                  <Bot className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  <p className="text-xs">Domande in linguaggio naturale sul soggiorno e il conto.</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-1">
                    {QUICK_PROMPTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => void sendChat(q)}
                        className="rounded-full border border-rw-line px-2 py-1 text-[10px] hover:border-rw-accent/40"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.ts} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[90%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap",
                      m.role === "user" ? "bg-rw-accent text-white" : "border border-rw-line bg-rw-surfaceAlt text-rw-ink",
                    )}
                  >
                    {m.content}
                    {m.streaming && m.content.length > 0 && <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-rw-accent" />}
                  </div>
                </div>
              ))}
              {statusText && (
                <p className="text-[10px] text-rw-muted">{statusText}</p>
              )}
            </div>
          </div>
        )}

        {analysis && section === "checkout" && (
          <div className="space-y-3">
            {analysis.checkoutBlocked && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                <p className="font-semibold">Checkout bloccato</p>
                <ul className="mt-1 list-inside list-disc">
                  {analysis.checkoutBlockReasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs font-semibold text-rw-ink">Checklist pre-checkout</p>
            {analysis.checkoutChecklist.map((item) => (
              <div key={item.id} className="flex items-start gap-2 text-xs">
                {item.status === "ok" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />}
                {item.status === "warn" && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />}
                {item.status === "fail" && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />}
                <div>
                  <p className="font-semibold text-rw-ink">{item.label}</p>
                  <p className="text-rw-muted">{item.detail}</p>
                </div>
              </div>
            ))}
            <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 text-xs">
              <p className="font-semibold text-rw-ink">Payment Assistant</p>
              {analysis.paymentAssistant.suggestedActions.map((a) => (
                <p key={a} className="text-rw-muted">• {a}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-rw-line px-3 py-3">
        <div className="flex items-center gap-2">
          <VoiceButton onResult={handleVoice} compact className="shrink-0" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendChat(input);
              }
            }}
            placeholder="Chiedi all'AI…"
            disabled={streaming}
            className="flex-1 rounded-xl border border-rw-line bg-rw-bg px-3 py-2 text-xs text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent disabled:opacity-60"
          />
          {streaming ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/40 text-red-400"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!input.trim()}
              onClick={() => void sendChat(input)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-rw-accent text-white disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[10px] text-rw-muted">
          Voice: &quot;Mostra il saldo&quot;, &quot;Registra pagamento&quot;, &quot;Chiudi il conto&quot;
        </p>
      </div>
    </aside>
  );
}

export function FolioAiToggle({ onClick, collapsed }: { onClick: () => void; collapsed?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-rw-accent/30 bg-rw-accent/10 px-3 py-2 text-xs font-semibold text-rw-accent transition hover:bg-rw-accent/20"
    >
      {collapsed ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      <Sparkles className="h-3.5 w-3.5" /> AI Concierge
    </button>
  );
}

function SummaryCard({ title, text, warn }: { title: string; text: string; warn?: boolean }) {
  return (
    <div className={cn("rounded-xl border px-3 py-2 text-xs", warn ? "border-amber-500/30 bg-amber-500/5" : "border-rw-line bg-rw-surfaceAlt")}>
      <p className="font-semibold text-rw-ink">{title}</p>
      <p className="text-rw-muted">{text}</p>
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-rw-line bg-rw-surfaceAlt p-2">
      <p className="text-[10px] text-rw-muted">{label}</p>
      <p className={cn("font-semibold", highlight ? "text-amber-400" : "text-rw-ink")}>{value}</p>
    </div>
  );
}

function AnomalyChip({ severity, title, detail }: { severity: string; title: string; detail: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2 text-xs",
        severity === "critical" ? "border-red-500/30 bg-red-500/5" : severity === "warning" ? "border-amber-500/30 bg-amber-500/5" : "border-rw-line bg-rw-surfaceAlt",
      )}
    >
      <p className="font-semibold text-rw-ink">{title}</p>
      <p className="text-rw-muted">{detail}</p>
    </div>
  );
}

export type { FolioAiAnalysis };
