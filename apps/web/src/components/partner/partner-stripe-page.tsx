"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import { TabBar } from "@/components/shared/tab-bar";
import { BTN_GHOST } from "@/components/shared/ui-classes";
import { useI10n } from "@/core/i18n/formatters";
import { useI18n } from "@/core/i18n/provider";
import { StatusPill } from "@/components/shared/status-pill";

type StripeData = {
  subscriptions: Array<{
    id: string;
    tenantId: string;
    tenantName: string;
    status: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
  }>;
  invoices: Array<{
    id: string;
    tenantId: string | null;
    type: string;
    status: string;
    createdAt: string;
    amount: number | null;
    customerEmail: string | null;
    periodEnd: string | null;
  }>;
};

export function PartnerStripePage() {
  const { t } = useI18n();
  const { formatCurrency, formatDateTime } = useI10n();
  const [data, setData] = useState<StripeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"subs" | "invoices">("subs");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partner/stripe", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as StripeData;
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

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title={t("partner.stripe.title")} subtitle={t("partner.stripe.subtitle")}>
        <button type="button" onClick={() => void load()} className={BTN_GHOST}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t("ui.update")}
        </button>
      </PageHeader>

      <TabBar
        tabs={[
          { id: "subs", label: t("partner.stripe.tab.subs") },
          { id: "invoices", label: t("partner.stripe.tab.invoices") },
        ]}
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
      />

      {tab === "subs" && (
        <Card title={t("partner.stripe.subs.title")}>
          <DataTable
            stickyHeader
            columns={[
              { key: "tenant", header: t("partner.stripe.col.tenant"), render: (r) => r.tenantName },
              { key: "status", header: t("partner.stripe.col.status"), render: (r) => <StatusPill>{r.status}</StatusPill> },
              { key: "sub", header: t("partner.stripe.col.subscription"), render: (r) => <span className="font-mono text-xs">{r.stripeSubscriptionId}</span> },
              { key: "end", header: t("partner.stripe.col.periodEnd"), render: (r) => (r.currentPeriodEnd ? formatDateTime(r.currentPeriodEnd) : "—") },
              { key: "cancel", header: t("partner.stripe.col.cancel"), render: (r) => (r.cancelAtPeriodEnd ? t("partner.stripe.yes") : t("partner.stripe.no")) },
            ]}
            data={data?.subscriptions ?? []}
            keyExtractor={(r) => r.id}
            emptyMessage={t("partner.stripe.empty")}
          />
        </Card>
      )}

      {tab === "invoices" && (
        <Card title={t("partner.stripe.invoices.title")}>
          <DataTable
            stickyHeader
            columns={[
              { key: "date", header: t("partner.stripe.col.date"), render: (r) => formatDateTime(r.createdAt) },
              { key: "type", header: t("partner.stripe.col.type"), render: (r) => r.type },
              { key: "amount", header: t("partner.stripe.col.amount"), render: (r) => (r.amount != null ? formatCurrency(r.amount) : "—") },
              { key: "email", header: t("partner.stripe.col.customer"), render: (r) => r.customerEmail ?? "—" },
              { key: "status", header: t("partner.stripe.col.status"), render: (r) => r.status },
            ]}
            data={data?.invoices ?? []}
            keyExtractor={(r) => r.id}
            emptyMessage={t("partner.stripe.empty")}
          />
        </Card>
      )}
    </div>
  );
}
