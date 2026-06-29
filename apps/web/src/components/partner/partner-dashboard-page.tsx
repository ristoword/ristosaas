"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CreditCard,
  Hotel,
  Loader2,
  RefreshCw,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { KpiTile } from "@/components/shared/kpi-tile";
import { KPI_GRID } from "@/components/shared/ui-classes";
import { BTN_GHOST } from "@/components/shared/ui-classes";
import { useI10n } from "@/core/i18n/formatters";
import { useI18n } from "@/core/i18n/provider";

type DashboardData = {
  licenses: {
    total: number;
    trial: number;
    active: number;
    suspended: number;
    expired: number;
    newToday: number;
    newWeek: number;
    newMonth: number;
    trialsExpiringWeek: number;
  };
  subscriptions: { active: number; cancelled: number; trialConverted: number };
  revenue: {
    mrr: number;
    arr: number;
    daily: number;
    monthly: number;
    yearly: number;
    forecast: number;
  };
  platform: {
    tenants: number;
    hotels: number;
    restaurants: number;
    users: number;
    dealers: number;
    partners: number;
  };
  generatedAt: string;
};

export function PartnerDashboardPage() {
  const { t } = useI18n();
  const { formatCurrency } = useI10n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/partner/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error(t("partner.dashboard.loadErr"));
      const json = (await res.json()) as DashboardData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("partner.dashboard.loadErr"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const fmt = (n: number) => formatCurrency(n);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title={t("partner.dashboard.title")} subtitle={t("partner.dashboard.subtitle")}>
        <button type="button" onClick={() => void load()} className={BTN_GHOST}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t("ui.update")}
        </button>
      </PageHeader>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {loading && !data && (
        <div className="flex justify-center py-16 text-rw-muted">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {data && (
        <>
          <section>
            <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-rw-muted">
              {t("partner.dashboard.licenses")}
            </h2>
            <div className={KPI_GRID}>
              <KpiTile label={t("partner.kpi.licensesTotal")} value={data.licenses.total} icon={CreditCard} />
              <KpiTile label={t("partner.kpi.licensesTrial")} value={data.licenses.trial} tone="warn" />
              <KpiTile label={t("partner.kpi.licensesActive")} value={data.licenses.active} tone="success" />
              <KpiTile label={t("partner.kpi.licensesSuspended")} value={data.licenses.suspended} tone="danger" />
              <KpiTile label={t("partner.kpi.licensesExpired")} value={data.licenses.expired} />
              <KpiTile label={t("partner.kpi.newToday")} value={data.licenses.newToday} tone="info" />
              <KpiTile label={t("partner.kpi.newWeek")} value={data.licenses.newWeek} />
              <KpiTile label={t("partner.kpi.newMonth")} value={data.licenses.newMonth} />
              <KpiTile label={t("partner.kpi.trialsExpiring")} value={data.licenses.trialsExpiringWeek} tone="warn" />
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-rw-muted">
              {t("partner.dashboard.subscriptions")}
            </h2>
            <div className={KPI_GRID}>
              <KpiTile label={t("partner.kpi.subsActive")} value={data.subscriptions.active} tone="success" />
              <KpiTile label={t("partner.kpi.subsCancelled")} value={data.subscriptions.cancelled} tone="danger" />
              <KpiTile label={t("partner.kpi.trialConverted")} value={data.subscriptions.trialConverted} tone="info" />
            </div>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-rw-muted">
              <TrendingUp className="h-4 w-4" /> {t("partner.dashboard.revenue")}
            </h2>
            <div className={KPI_GRID}>
              <KpiTile label={t("partner.kpi.mrr")} value={fmt(data.revenue.mrr)} highlight />
              <KpiTile label={t("partner.kpi.arr")} value={fmt(data.revenue.arr)} tone="success" />
              <KpiTile label={t("partner.kpi.revenueDaily")} value={fmt(data.revenue.daily)} />
              <KpiTile label={t("partner.kpi.revenueMonthly")} value={fmt(data.revenue.monthly)} />
              <KpiTile label={t("partner.kpi.revenueYearly")} value={fmt(data.revenue.yearly)} />
              <KpiTile label={t("partner.kpi.forecast")} value={fmt(data.revenue.forecast)} tone="info" />
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-rw-muted">
              {t("partner.dashboard.platform")}
            </h2>
            <div className={KPI_GRID}>
              <KpiTile label={t("partner.kpi.tenants")} value={data.platform.tenants} icon={Building2} />
              <KpiTile label={t("partner.kpi.hotels")} value={data.platform.hotels} icon={Hotel} />
              <KpiTile label={t("partner.kpi.restaurants")} value={data.platform.restaurants} icon={Store} />
              <KpiTile label={t("partner.kpi.users")} value={data.platform.users} icon={Users} />
              <KpiTile label={t("partner.kpi.dealers")} value={data.platform.dealers} />
              <KpiTile label={t("partner.kpi.partners")} value={data.platform.partners} />
            </div>
          </section>

          <Card title={t("partner.dashboard.note.title")} description={t("partner.dashboard.note.desc")}>
            <p className="text-xs text-rw-muted">
              {t("partner.dashboard.generatedAt")}: {new Date(data.generatedAt).toLocaleString()}
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
