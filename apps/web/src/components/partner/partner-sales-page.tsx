"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import { KpiTile } from "@/components/shared/kpi-tile";
import { BTN_GHOST, KPI_GRID } from "@/components/shared/ui-classes";
import { useI10n } from "@/core/i18n/formatters";
import { useI18n } from "@/core/i18n/provider";
import { StatusPill } from "@/components/shared/status-pill";

type LicenseRow = {
  tenantId: string;
  tenantName: string;
  plan: string;
  billingCycle: string;
  status: string;
  activatedAt: string;
  expiresAt: string;
  partnerCode: string | null;
  partnerName: string | null;
  licensePrice: number | null;
  commissionEuros: number | null;
  accessStatus: string;
};

type SalesData = {
  licenses: LicenseRow[];
  partners: Array<{ code: string; name: string; country: string; active: boolean }>;
  dealers: Array<{ id: string; name: string; email: string; partnerCode: string | null }>;
};

export function PartnerSalesPage() {
  const { t } = useI18n();
  const { formatCurrency, formatDateTime } = useI10n();
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partner/sales", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as SalesData;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = (data?.licenses ?? []).filter((r) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return `${r.tenantName} ${r.partnerName} ${r.partnerCode} ${r.status}`.toLowerCase().includes(q);
  });

  const active = rows.filter((r) => r.status === "active").length;
  const trial = rows.filter((r) => r.status === "trial").length;
  const commission = rows.reduce((s, r) => s + (r.commissionEuros ?? 0), 0);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title={t("partner.sales.title")} subtitle={t("partner.sales.subtitle")}>
        <button type="button" onClick={() => void load()} className={BTN_GHOST}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t("ui.update")}
        </button>
      </PageHeader>

      <div className={KPI_GRID}>
        <KpiTile label={t("partner.sales.kpi.total")} value={rows.length} />
        <KpiTile label={t("partner.sales.kpi.active")} value={active} tone="success" />
        <KpiTile label={t("partner.sales.kpi.trial")} value={trial} tone="warn" />
        <KpiTile label={t("partner.sales.kpi.commission")} value={formatCurrency(commission)} />
        <KpiTile label={t("partner.sales.kpi.dealers")} value={data?.dealers.length ?? 0} />
        <KpiTile label={t("partner.sales.kpi.partners")} value={data?.partners.length ?? 0} />
      </div>

      <Card title={t("partner.sales.table.title")}>
        <input
          className="mb-4 w-full max-w-md rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm"
          placeholder={t("partner.sales.search")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <DataTable
          stickyHeader
          columns={[
            { key: "tenant", header: t("partner.sales.col.tenant"), render: (r) => r.tenantName },
            { key: "plan", header: t("partner.sales.col.plan"), render: (r) => r.plan },
            { key: "status", header: t("partner.sales.col.status"), render: (r) => <StatusPill tone={r.status === "active" ? "success" : r.status === "trial" ? "warn" : "default"}>{r.status}</StatusPill> },
            { key: "dealer", header: t("partner.sales.col.dealer"), render: (r) => r.partnerName ?? "—" },
            { key: "price", header: t("partner.sales.col.price"), render: (r) => r.licensePrice != null ? formatCurrency(r.licensePrice) : "—" },
            { key: "commission", header: t("partner.sales.col.commission"), render: (r) => r.commissionEuros != null ? formatCurrency(r.commissionEuros) : "—" },
            { key: "expires", header: t("partner.sales.col.expires"), render: (r) => formatDateTime(r.expiresAt) },
          ]}
          data={rows}
          keyExtractor={(r) => `${r.tenantId}-${r.activatedAt}`}
          emptyMessage={t("partner.sales.empty")}
        />
      </Card>
    </div>
  );
}
