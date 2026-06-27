"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Bot,
  ChevronDown,
  ChevronUp,
  Crown,
  Gift,
  Loader2,
  Medal,
  Square,
  Star,
  Target,
  Trophy,
  TrendingUp,
  Wine,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";
import { useAuth } from "@/components/auth/auth-context";
import { useI18n } from "@/core/i18n/provider";
import { useAiStreamText } from "@/hooks/use-ai-stream";

type RewardEntry = {
  id: string;
  type: string;
  description: string;
  value: number | null;
  awardedByName: string;
  createdAt: string;
};

type StaffEntry = {
  name: string;
  ordersCount: number;
  tablesServed: number;
  totalCovers: number;
  totalRevenue: number;
  itemsSold: number;
  premiumBottles: number;
  premiumBottleRevenue: number;
  avgOrderValue: number;
  avgCoverValue: number;
  closedOrders: number;
  billedOrders: number;
  categorySales: Record<string, number>;
  shiftsCount: number;
  totalHours: number;
  rewards: RewardEntry[];
};

type ApiResponse = {
  period: { from: string; to: string };
  leaderboard: StaffEntry[];
  totalOrders: number;
  totalRevenue: number;
};

const REWARD_TYPES = [
  { value: "bonus_cash", labelKey: "obiettivi.reward.bonus_cash", icon: "💰" },
  { value: "salary_increase", labelKey: "obiettivi.reward.salary_increase", icon: "📈" },
  { value: "meal_voucher", labelKey: "obiettivi.reward.meal_voucher", icon: "🍽️" },
  { value: "gift_voucher", labelKey: "obiettivi.reward.gift_voucher", icon: "🎁" },
  { value: "role_promotion", labelKey: "obiettivi.reward.role_promotion", icon: "⬆️" },
  { value: "recognition", labelKey: "obiettivi.reward.recognition", icon: "⭐" },
  { value: "extra_day_off", labelKey: "obiettivi.reward.extra_day_off", icon: "🏖️" },
  { value: "other", labelKey: "obiettivi.reward.other", icon: "📝" },
] as const;

const PODIUM_STYLES = [
  { bg: "from-amber-500/20 to-amber-600/10", border: "border-amber-500/40", icon: Crown, color: "text-amber-400" },
  { bg: "from-slate-300/20 to-slate-400/10", border: "border-slate-400/40", icon: Medal, color: "text-slate-300" },
  { bg: "from-orange-700/20 to-orange-800/10", border: "border-orange-600/40", icon: Medal, color: "text-orange-500" },
];

export function ObiettiviPage() {
  const { t } = useI18n();
  const { user } = useAuth();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => todayStr());
  const [dateTo, setDateTo] = useState(() => todayStr());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const { streamFrom, stop, isStreaming, statusText, text: streamingReport } = useAiStreamText();

  const [rewardModal, setRewardModal] = useState<string | null>(null);
  const [rewardType, setRewardType] = useState("recognition");
  const [rewardDesc, setRewardDesc] = useState("");
  const [rewardValue, setRewardValue] = useState("");
  const [rewardSaving, setRewardSaving] = useState(false);

  const isManager = user?.role === "supervisor" || user?.role === "owner" || user?.role === "super_admin";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/obiettivi?from=${dateFrom}&to=${dateTo}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const requestAiReport = useCallback(async () => {
    setAiReport("");
    await streamFrom("/staff/obiettivi/ai-report", {}, {
      onComplete: (full) => setAiReport(full),
    });
  }, [streamFrom]);

  const saveReward = useCallback(async () => {
    if (!rewardModal || !rewardDesc) return;
    setRewardSaving(true);
    try {
      await fetch("/api/staff/obiettivi/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffName: rewardModal,
          type: rewardType,
          description: rewardDesc,
          value: rewardValue ? Number(rewardValue) : null,
          period: `${dateFrom}/${dateTo}`,
        }),
      });
      setRewardModal(null);
      setRewardDesc("");
      setRewardValue("");
      await loadData();
    } finally {
      setRewardSaving(false);
    }
  }, [rewardModal, rewardType, rewardDesc, rewardValue, dateFrom, dateTo, loadData]);

  const deleteReward = useCallback(async (id: string) => {
    await fetch(`/api/staff/obiettivi/rewards?id=${id}`, { method: "DELETE" });
    await loadData();
  }, [loadData]);

  const topSeller = useMemo(() => data?.leaderboard[0], [data]);

  const presetToday = () => { setDateFrom(todayStr()); setDateTo(todayStr()); };
  const presetWeek = () => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    setDateFrom(fmtDate(d));
    setDateTo(todayStr());
  };
  const presetMonth = () => {
    const d = new Date();
    d.setDate(1);
    setDateFrom(fmtDate(d));
    setDateTo(todayStr());
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <PageHeader title={t("obiettivi.title")} subtitle={t("obiettivi.subtitle")}>
        {isManager && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => void requestAiReport()}
              disabled={isStreaming}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              {t("obiettivi.aiReport")}
            </button>
            {isStreaming && (
              <button
                type="button"
                onClick={stop}
                className="flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400"
              >
                <Square className="h-3 w-3 fill-current" /> Stop
              </button>
            )}
          </div>
        )}
      </PageHeader>

      {/* Date Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={presetToday} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition", dateFrom === todayStr() && dateTo === todayStr() ? "bg-rw-primary text-white" : "bg-rw-surfaceAlt text-rw-muted hover:bg-rw-border")}>
          {t("obiettivi.today")}
        </button>
        <button onClick={presetWeek} className="rounded-lg bg-rw-surfaceAlt px-3 py-1.5 text-xs font-medium text-rw-muted transition hover:bg-rw-border">
          {t("obiettivi.week")}
        </button>
        <button onClick={presetMonth} className="rounded-lg bg-rw-surfaceAlt px-3 py-1.5 text-xs font-medium text-rw-muted transition hover:bg-rw-border">
          {t("obiettivi.month")}
        </button>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-rw-border bg-rw-surface px-3 py-1.5 text-xs text-rw-ink" />
        <span className="text-xs text-rw-muted">→</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-rw-border bg-rw-surface px-3 py-1.5 text-xs text-rw-ink" />
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label={t("obiettivi.totalOrders")} value={data.totalOrders} icon={<Target className="h-5 w-5 text-blue-400" />} />
          <SummaryCard label={t("obiettivi.totalRevenue")} value={`€${data.totalRevenue.toFixed(2)}`} icon={<TrendingUp className="h-5 w-5 text-emerald-400" />} />
          <SummaryCard label={t("obiettivi.staffCount")} value={data.leaderboard.length} icon={<Star className="h-5 w-5 text-amber-400" />} />
          <SummaryCard
            label={t("obiettivi.bestSeller")}
            value={topSeller?.name ?? "-"}
            icon={<Trophy className="h-5 w-5 text-amber-400" />}
            sub={topSeller ? `€${topSeller.totalRevenue.toFixed(2)}` : undefined}
          />
        </div>
      )}

      {/* AI Report */}
      {(aiReport || isStreaming) && (
        <div className="relative rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-purple-500/5 p-5">
          {!isStreaming && (
            <button onClick={() => setAiReport(null)} className="absolute right-3 top-3 text-rw-muted hover:text-rw-ink"><X className="h-4 w-4" /></button>
          )}
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-400">
            <Bot className="h-5 w-5" />
            {t("obiettivi.aiReportTitle")}
          </div>
          {isStreaming && statusText && (
            <p className="mb-2 text-xs text-rw-muted">{statusText}</p>
          )}
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-rw-ink">
            {aiReport ?? streamingReport}
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-violet-400 align-middle" />
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-rw-primary" />
        </div>
      )}

      {/* Leaderboard */}
      {!loading && data && (
        <div className="space-y-3">
          {data.leaderboard.map((entry, idx) => {
            const podium = idx < 3 ? PODIUM_STYLES[idx] : null;
            const isOpen = expanded === entry.name;
            const PodiumIcon = podium?.icon;

            return (
              <div
                key={entry.name}
                className={cn(
                  "rounded-xl border transition",
                  podium ? `bg-gradient-to-r ${podium.bg} ${podium.border}` : "border-rw-border bg-rw-surface",
                )}
              >
                {/* Row Header */}
                <button
                  onClick={() => setExpanded(isOpen ? null : entry.name)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold", podium ? podium.color : "text-rw-muted bg-rw-surfaceAlt")}>
                    {PodiumIcon ? <PodiumIcon className="h-5 w-5" /> : `#${idx + 1}`}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-rw-ink">{entry.name}</p>
                    <p className="text-xs text-rw-muted">
                      {entry.ordersCount} {t("obiettivi.orders")} · {entry.tablesServed} {t("obiettivi.tables")} · {entry.totalCovers} {t("obiettivi.covers")}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-base font-bold text-emerald-400">€{entry.totalRevenue.toFixed(2)}</p>
                      <p className="text-[10px] text-rw-muted">{t("obiettivi.revenue")}</p>
                    </div>
                    {entry.premiumBottles > 0 && (
                      <div className="flex items-center gap-1 text-amber-400">
                        <Wine className="h-4 w-4" />
                        <span className="text-xs font-medium">{entry.premiumBottles}</span>
                      </div>
                    )}
                    {entry.rewards.length > 0 && (
                      <div className="flex items-center gap-1 text-violet-400">
                        <Award className="h-4 w-4" />
                        <span className="text-xs font-medium">{entry.rewards.length}</span>
                      </div>
                    )}
                    {isOpen ? <ChevronUp className="h-4 w-4 text-rw-muted" /> : <ChevronDown className="h-4 w-4 text-rw-muted" />}
                  </div>
                </button>

                {/* Expanded Details */}
                {isOpen && (
                  <div className="border-t border-rw-border/50 px-4 pb-4 pt-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <MiniStat label={t("obiettivi.avgOrder")} value={`€${entry.avgOrderValue.toFixed(2)}`} />
                      <MiniStat label={t("obiettivi.avgCover")} value={`€${entry.avgCoverValue.toFixed(2)}`} />
                      <MiniStat label={t("obiettivi.itemsSold")} value={entry.itemsSold} />
                      <MiniStat label={t("obiettivi.premiumRevenue")} value={`€${entry.premiumBottleRevenue.toFixed(2)}`} />
                      <MiniStat label={t("obiettivi.shifts")} value={entry.shiftsCount} />
                      <MiniStat label={t("obiettivi.hours")} value={`${entry.totalHours.toFixed(1)}h`} />
                      <MiniStat label={t("obiettivi.closedOrders")} value={entry.closedOrders} />
                      <MiniStat label={t("obiettivi.billedOrders")} value={entry.billedOrders} />
                    </div>

                    {/* Category Breakdown */}
                    {Object.keys(entry.categorySales).length > 0 && (
                      <div className="mt-3">
                        <p className="mb-1 text-xs font-medium text-rw-muted">{t("obiettivi.categorySales")}</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(entry.categorySales)
                            .sort(([, a], [, b]) => b - a)
                            .map(([cat, val]) => (
                              <Chip key={cat} label={cat} value={`€${val.toFixed(2)}`} />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Rewards */}
                    {entry.rewards.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-1 text-xs font-medium text-rw-muted">{t("obiettivi.rewardsTitle")}</p>
                        <div className="space-y-1">
                          {entry.rewards.map((r) => {
                            const rt = REWARD_TYPES.find((x) => x.value === r.type);
                            return (
                              <div key={r.id} className="flex items-center gap-2 rounded-lg bg-rw-surfaceAlt p-2 text-xs">
                                <span>{rt?.icon ?? "📝"}</span>
                                <span className="flex-1 text-rw-ink">{r.description}</span>
                                {r.value != null && <span className="font-medium text-emerald-400">€{r.value.toFixed(2)}</span>}
                                <span className="text-rw-muted">{t("obiettivi.by")} {r.awardedByName}</span>
                                {isManager && (
                                  <button onClick={() => deleteReward(r.id)} className="text-red-400 hover:text-red-300"><X className="h-3 w-3" /></button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Award Button */}
                    {isManager && (
                      <button
                        onClick={() => { setRewardModal(entry.name); setRewardType("recognition"); setRewardDesc(""); setRewardValue(""); }}
                        className="mt-3 flex items-center gap-2 rounded-lg bg-violet-600/20 px-3 py-2 text-xs font-medium text-violet-400 transition hover:bg-violet-600/30"
                      >
                        <Gift className="h-4 w-4" />
                        {t("obiettivi.assignReward")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {data.leaderboard.length === 0 && (
            <div className="py-16 text-center text-sm text-rw-muted">{t("obiettivi.noData")}</div>
          )}
        </div>
      )}

      {/* Reward Modal */}
      {rewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setRewardModal(null)}>
          <div className="w-full max-w-md rounded-2xl bg-rw-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-rw-ink">
              {t("obiettivi.rewardFor")} {rewardModal}
            </h3>

            <label className="mb-1 block text-xs font-medium text-rw-muted">{t("obiettivi.rewardType")}</label>
            <select
              value={rewardType}
              onChange={(e) => setRewardType(e.target.value)}
              className="mb-3 w-full rounded-lg border border-rw-border bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink"
            >
              {REWARD_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>{rt.icon} {t(rt.labelKey)}</option>
              ))}
            </select>

            <label className="mb-1 block text-xs font-medium text-rw-muted">{t("obiettivi.rewardDescription")}</label>
            <textarea
              value={rewardDesc}
              onChange={(e) => setRewardDesc(e.target.value)}
              placeholder={t("obiettivi.rewardDescPlaceholder")}
              className="mb-3 w-full rounded-lg border border-rw-border bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink"
              rows={3}
            />

            <label className="mb-1 block text-xs font-medium text-rw-muted">{t("obiettivi.rewardValue")}</label>
            <input
              type="number"
              step="0.01"
              value={rewardValue}
              onChange={(e) => setRewardValue(e.target.value)}
              placeholder="€ (opzionale)"
              className="mb-4 w-full rounded-lg border border-rw-border bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink"
            />

            <div className="flex gap-3">
              <button onClick={() => setRewardModal(null)} className="flex-1 rounded-lg border border-rw-border px-4 py-2 text-sm text-rw-muted hover:bg-rw-surfaceAlt">
                {t("obiettivi.cancel")}
              </button>
              <button
                onClick={saveReward}
                disabled={rewardSaving || !rewardDesc}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
              >
                {rewardSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("obiettivi.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, sub }: { label: string; value: string | number; icon: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-rw-border bg-rw-surface p-4">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xl font-bold text-rw-ink">{value}</p>
        <p className="truncate text-[10px] text-rw-muted">{label}</p>
        {sub && <p className="text-xs text-emerald-400">{sub}</p>}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-rw-surfaceAlt p-2.5">
      <p className="text-base font-semibold text-rw-ink">{value}</p>
      <p className="text-[10px] text-rw-muted">{label}</p>
    </div>
  );
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
