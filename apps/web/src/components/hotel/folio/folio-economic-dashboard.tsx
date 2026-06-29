"use client";

import type { FolioEconomics } from "@/lib/hotel/folio-utils";
import { Card } from "@/components/shared/card";
import { KpiTile } from "@/components/shared/kpi-tile";
import { KPI_GRID } from "@/components/shared/ui-classes";
import { tf } from "@/core/i18n/interpolate";
import { useI18n } from "@/core/i18n/provider";
import { useI10n } from "@/core/i18n/formatters";

export function FolioEconomicDashboard({ economics, currency }: { economics: FolioEconomics; currency: string }) {
  const { t } = useI18n();
  const { formatCurrency } = useI10n();
  const roomTotal = economics.roomTotal + economics.projectedRoomRate;
  const fmt = (n: number) => formatCurrency(n);

  return (
    <Card className="min-w-0" title={t("hotel.folio.economics.title")}>
      <div className={KPI_GRID}>
        <KpiTile label={t("hotel.folio.economics.roomTotal")} value={fmt(roomTotal)} />
        <KpiTile label={t("hotel.folio.economics.extraTotal")} value={fmt(economics.extraTotal)} />
        <KpiTile label={t("hotel.folio.economics.taxTotal")} value={fmt(economics.taxTotal)} tone="warn" />
        <KpiTile label={t("hotel.folio.economics.vatTotal")} value={fmt(economics.vatTotal)} />
        <KpiTile label={t("hotel.folio.economics.paidTotal")} value={fmt(economics.paidTotal)} tone="success" />
        <KpiTile
          label={t("hotel.folio.economics.dueTotal")}
          value={fmt(economics.dueTotal)}
          tone="danger"
          highlight={economics.dueTotal > 0}
        />
        <KpiTile label={t("hotel.folio.economics.creditTotal")} value={fmt(economics.creditTotal)} tone="success" />
      </div>
      {economics.projectedRoomRate > 0 && (
        <p className="mt-4 text-xs text-amber-400/90">
          {tf(t, "hotel.folio.economics.projectedRate", { amount: `${currency} ${economics.projectedRoomRate.toFixed(2)}` })}
        </p>
      )}
    </Card>
  );
}
