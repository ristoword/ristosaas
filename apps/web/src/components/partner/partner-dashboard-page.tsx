"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CreditCard,
  Handshake,
  Hotel,
  Loader2,
  RefreshCw,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import { UserAccessReportPanel } from "@/components/admin/user-access-report-panel";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
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
  sociPartners: Array<{
    code: string;
    name: string;
    country: string;
    email: string;
    phone: string;
    notes: string;
    partnerKind: string;
    linkedAccounts: Array<{
      id: string;
      username: string;
      name: string;
      email: string;
      role: string;
      tenantName: string;
      tenantSlug: string;
      lastLoginAt: string | null;
    }>;
  }>;
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

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-rw-muted">
              <Handshake className="h-4 w-4" />
              {t("partner.dashboard.soci")}
            </h2>
            <Card
              title={t("partner.soci.title")}
              description={t("partner.soci.desc")}
            >
              {data.sociPartners?.length === 0 ? (
                <p className="text-sm text-rw-muted">{t("partner.soci.empty")}</p>
              ) : (
                <div className="space-y-4">
                  {data.sociPartners?.map((socio) => (
                    <div key={socio.code} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-rw-ink">{socio.name}</p>
                          <p className="text-xs text-rw-muted">
                            {t("partner.soci.badge")} · {socio.country}
                            {socio.email ? ` · ${socio.email}` : ""}
                          </p>
                          {socio.notes ? <p className="mt-1 text-sm text-rw-soft">{socio.notes}</p> : null}
                        </div>
                        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-300">
                          {t("partner.soci.badge")}
                        </span>
                      </div>
                      {socio.linkedAccounts.length > 0 ? (
                        <DataTable
                          columns={[
                            { key: "name", header: t("partner.soci.col.account"), render: (a) => a.name },
                            { key: "username", header: "Username", render: (a) => <span className="font-mono text-xs">{a.username}</span> },
                            { key: "tenant", header: t("partner.soci.col.tenant"), render: (a) => a.tenantName },
                            { key: "role", header: t("partner.soci.col.role"), render: (a) => a.role },
                            {
                              key: "lastLogin",
                              header: t("partner.soci.col.lastLogin"),
                              render: (a) =>
                                a.lastLoginAt
                                  ? new Date(a.lastLoginAt).toLocaleString("it-IT")
                                  : t("partner.soci.neverLoggedIn"),
                            },
                          ]}
                          data={socio.linkedAccounts}
                          keyExtractor={(a) => a.id}
                        />
                      ) : (
                        <p className="mt-3 text-xs text-rw-muted">{t("partner.soci.noLinkedAccount")}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <section>
            <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-rw-muted">
              {t("partner.dashboard.userAccess")}
            </h2>
            <UserAccessReportPanel
              mode="readonly"
              apiPath="/partner/user-access"
              title={t("partner.userAccess.title")}
              description={t("partner.userAccess.desc")}
            />
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
