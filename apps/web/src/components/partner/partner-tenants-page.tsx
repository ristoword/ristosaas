"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import { BTN_GHOST } from "@/components/shared/ui-classes";
import { useI10n } from "@/core/i18n/formatters";
import { useI18n } from "@/core/i18n/provider";
import { StatusPill } from "@/components/shared/status-pill";

type TenantRow = {
  id: string;
  name: string;
  slug: string | null;
  plan: string;
  accessStatus: string;
  usersCount: number;
  license: {
    status: string;
    plan: string;
    billingCycle: string;
    seats: number;
    usedSeats: number;
    expiresAt: string;
    partnerCode: string | null;
  } | null;
};

export function PartnerTenantsPage() {
  const { t } = useI18n();
  const { formatDateTime } = useI10n();
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partner/tenants", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { tenants: TenantRow[] };
      setRows(json.tenants);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title={t("partner.tenants.title")} subtitle={t("partner.tenants.subtitle")}>
        <button type="button" onClick={() => void load()} className={BTN_GHOST}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t("ui.update")}
        </button>
      </PageHeader>

      <Card title={t("partner.tenants.table")}>
        <DataTable
          stickyHeader
          columns={[
            { key: "name", header: t("partner.tenants.col.name"), render: (r) => r.name },
            { key: "plan", header: t("partner.tenants.col.plan"), render: (r) => r.plan },
            { key: "access", header: t("partner.tenants.col.access"), render: (r) => <StatusPill tone={r.accessStatus === "active" ? "success" : "danger"}>{r.accessStatus}</StatusPill> },
            { key: "license", header: t("partner.tenants.col.license"), render: (r) => r.license?.status ?? "—" },
            { key: "seats", header: t("partner.tenants.col.seats"), render: (r) => (r.license ? `${r.license.usedSeats}/${r.license.seats}` : "—") },
            { key: "users", header: t("partner.tenants.col.users"), render: (r) => r.usersCount },
            { key: "expires", header: t("partner.tenants.col.expires"), render: (r) => (r.license ? formatDateTime(r.license.expiresAt) : "—") },
          ]}
          data={rows}
          keyExtractor={(r) => r.id}
          emptyMessage={t("partner.tenants.empty")}
        />
      </Card>
    </div>
  );
}
