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
import { TabBar } from "@/components/shared/tab-bar";
import { KpiTile } from "@/components/shared/kpi-tile";
import { StatusPill } from "@/components/shared/status-pill";
import { BTN_GHOST, BTN_OUTLINE, BTN_PRIMARY, INPUT_CLASS, KPI_GRID } from "@/components/shared/ui-classes";
import { cn } from "@/lib/utils";
import { consumeAiStream } from "@/lib/ai/consume-ai-stream";
import { VoiceButton } from "@/components/ai/ai-voice";
import { hotelFolioAiApi, type FolioAiAnalysis, type FolioAiProposedAction } from "@/lib/api-client";
import type { Customer, GuestFolio, HotelReservation } from "@/lib/api-client";
import { tf } from "@/core/i18n/interpolate";
import { useI10n } from "@/core/i18n/formatters";
import { useI18n } from "@/core/i18n/provider";

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

const PROMPT_KEYS = [
  "hotel.folio.ai.prompt.balance",
  "hotel.folio.ai.prompt.anomalies",
  "hotel.folio.ai.prompt.restaurant",
  "hotel.folio.ai.prompt.services",
  "hotel.folio.ai.prompt.balanceDiff",
] as const;

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
  const { t } = useI18n();
  const { formatCurrency } = useI10n();
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
      setError(e instanceof Error ? e.message : t("hotel.folio.ai.error.analysis"));
    } finally {
      setLoading(false);
    }
  }, [folio.id, locale, onAnalysis, t]);

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
      setStatusText(t("hotel.folio.ai.analyzing"));

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
                  ? { role: "assistant", content: tf(t, "hotel.folio.ai.error.generic", { msg }), ts: assistantTs, streaming: false }
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
    [streaming, messages, folio.id, locale, t],
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
        void sendChat(t("hotel.folio.ai.chat.balanceQuestion"));
        return;
      }
      if (lower.includes("apri il folio") || lower.includes("folio")) {
        setSection("overview");
        return;
      }
      void sendChat(text);
    },
    [onOpenPayment, onCheckout, sendChat, t],
  );

  const executeAction = async (action: FolioAiProposedAction) => {
    if (!confirm(tf(t, "hotel.folio.ai.confirmAction", { label: action.label, description: action.description }))) return;
    try {
      await hotelFolioAiApi.confirmAction(folio.id, action.id, action.type);
      if (action.type === "payment") onOpenPayment?.();
      else if (action.type === "checkout") onCheckout?.();
      else if (action.type === "pdf") onExportPdf?.();
      else if (action.type === "email") onEmail?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("hotel.folio.ai.error.action"));
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
      setError(e instanceof Error ? e.message : t("hotel.folio.ai.error.report"));
    }
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-xl border border-r-0 border-rw-accent/30 bg-rw-accent/10 px-2 py-4 text-rw-accent shadow-lg hover:bg-rw-accent/20"
        title={t("hotel.folio.ai.open")}
      >
        <Sparkles className="h-5 w-5" />
        <span className="text-[10px] font-semibold [writing-mode:vertical-rl]">{t("hotel.folio.ai.label")}</span>
      </button>
    );
  }

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-t-2xl border border-rw-line bg-rw-surface shadow-2xl max-xl:max-h-[85dvh] xl:min-w-[320px] xl:max-w-[400px] xl:rounded-2xl xl:shadow-xl lg:sticky lg:top-4 lg:h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between border-b border-rw-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-rw-accent" />
          <div>
            <p className="font-display text-sm font-semibold text-rw-ink">{t("hotel.folio.ai.title")}</p>
            <p className="text-[10px] text-rw-muted">{folio.guestName ?? t("hotel.folio.guest.default")} · {formatCurrency(folio.balance)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => void loadAnalysis()} className="rounded-lg p-1.5 text-rw-muted hover:bg-rw-surfaceAlt hover:text-rw-ink" title={t("hotel.folio.ai.reanalyze")}>
            <Loader2 className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          {onToggleCollapse && (
            <button type="button" onClick={onToggleCollapse} className="rounded-lg p-1.5 text-rw-muted hover:text-rw-ink">
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <TabBar
        tabs={[
          { id: "overview", label: t("hotel.folio.ai.tab.overview") },
          { id: "chat", label: t("hotel.folio.ai.tab.chat") },
          { id: "checkout", label: t("hotel.folio.ai.tab.checkout") },
        ]}
        active={section}
        onChange={(id) => setSection(id as typeof section)}
      />

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading && !analysis && (
          <div className="flex flex-col items-center gap-2 py-8 text-rw-muted">
            <Loader2 className="h-8 w-8 animate-spin opacity-50" />
            <p className="text-sm">{t("hotel.folio.ai.loading")}</p>
          </div>
        )}

        {error && <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

        {analysis && section === "overview" && (
          <div className="space-y-3">
            <SummaryCard title={t("hotel.folio.ai.staySummary")} text={analysis.guestSummary.stayOverview} />
            {analysis.guestSummary.vip && (
              <StatusPill tone="warn">{t("hotel.folio.guestPanel.vip")}</StatusPill>
            )}
            {analysis.guestSummary.allergies.length > 0 && (
              <SummaryCard title={t("hotel.folio.ai.allergies")} text={analysis.guestSummary.allergies.join(", ")} warn />
            )}

            <div className={cn(KPI_GRID, "grid-cols-2 sm:grid-cols-2")}>
              <KpiTile label={t("hotel.folio.ai.kpi.spending")} value={formatCurrency(analysis.guestSummary.spending.total)} className="min-h-0 p-3 [&_p:last-child]:text-xl" />
              <KpiTile label={t("hotel.folio.ai.kpi.balance")} value={formatCurrency(analysis.guestSummary.spending.balance)} tone="warn" highlight={analysis.guestSummary.spending.balance > 0} className="min-h-0 p-3 [&_p:last-child]:text-xl" />
              <KpiTile label={t("hotel.folio.ai.kpi.paid")} value={formatCurrency(analysis.guestSummary.spending.paid)} tone="success" className="min-h-0 p-3 [&_p:last-child]:text-xl" />
              <KpiTile label={t("hotel.folio.ai.kpi.return")} value={`${Math.round(analysis.customerInsights.returnProbability * 100)}%`} className="min-h-0 p-3 [&_p:last-child]:text-xl" />
            </div>

            {analysis.anomalies.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-rw-ink">{tf(t, "hotel.folio.ai.anomalies", { n: analysis.anomalies.length })}</p>
                {analysis.anomalies.slice(0, 5).map((a) => (
                  <AnomalyChip key={a.id} severity={a.severity} title={a.title} detail={a.detail} />
                ))}
              </div>
            )}

            {analysis.revenueSuggestions.length > 0 && (
              <div className="space-y-2">
                <p className="flex items-center gap-1 text-xs font-semibold text-rw-ink">
                  <TrendingUp className="h-3.5 w-3.5 text-rw-accent" /> {t("hotel.folio.ai.revenue")}
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
                <p className="text-xs font-semibold text-amber-400">{t("hotel.folio.ai.fraud")}</p>
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
                <p className="text-xs font-semibold text-rw-ink">{t("hotel.folio.ai.suggestedActions")}</p>
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

            <button type="button" onClick={() => void handleReport()} className={cn(BTN_OUTLINE, "w-full text-xs")}>
              <Download className="h-3.5 w-3.5" /> {t("hotel.folio.ai.reportPdf")}
            </button>
          </div>
        )}

        {section === "chat" && (
          <div className="flex h-full flex-col">
            <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto pb-2">
              {messages.length === 0 && (
                <div className="py-6 text-center text-rw-muted">
                  <Bot className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  <p className="text-xs">{t("hotel.folio.ai.chat.empty")}</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-1">
                    {PROMPT_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => void sendChat(t(key))}
                        className="rounded-full border border-rw-line px-2 py-1 text-[10px] hover:border-rw-accent/40"
                      >
                        {t(key)}
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
                <p className="font-semibold">{t("hotel.folio.ai.checkout.blocked")}</p>
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
              <p className="font-semibold text-rw-ink">{t("hotel.folio.ai.paymentAssistant")}</p>
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
            placeholder={t("hotel.folio.ai.chat.placeholder")}
            disabled={streaming}
            className={cn(INPUT_CLASS, "flex-1 text-xs")}
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
              className={cn(BTN_PRIMARY, "h-9 w-9 shrink-0 p-0")}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[10px] text-rw-muted">
          {t("hotel.folio.ai.chat.voiceHint")}
        </p>
      </div>
    </aside>
  );
}

export function FolioAiToggle({ onClick, collapsed }: { onClick: () => void; collapsed?: boolean }) {
  const { t } = useI18n();
  return (
    <button type="button" onClick={onClick} className={cn(BTN_GHOST, "border-rw-accent/30 bg-rw-accent/10 text-rw-accent hover:bg-rw-accent/20")}>
      {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      <Sparkles className="h-4 w-4" /> {t("hotel.folio.ai.toggle")}
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
