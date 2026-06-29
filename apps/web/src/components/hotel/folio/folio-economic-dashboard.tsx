"use client";

import type { FolioEconomics } from "@/lib/hotel/folio-utils";
import { Card } from "@/components/shared/card";
import { KpiTile } from "@/components/shared/kpi-tile";
import { KPI_GRID } from "@/components/shared/ui-classes";

export function FolioEconomicDashboard({ economics, currency }: { economics: FolioEconomics; currency: string }) {
  const roomTotal = economics.roomTotal + economics.projectedRoomRate;

  return (
    <Card title="Dashboard economica">
      <div className={KPI_GRID}>
        <KpiTile label="Totale camera" value={`${currency} ${roomTotal.toFixed(2)}`} />
        <KpiTile label="Totale extra" value={`${currency} ${economics.extraTotal.toFixed(2)}`} />
        <KpiTile label="Totale tasse" value={`${currency} ${economics.taxTotal.toFixed(2)}`} tone="warn" />
        <KpiTile label="IVA stimata" value={`${currency} ${economics.vatTotal.toFixed(2)}`} />
        <KpiTile label="Pagato" value={`${currency} ${economics.paidTotal.toFixed(2)}`} tone="success" />
        <KpiTile label="Da pagare" value={`${currency} ${economics.dueTotal.toFixed(2)}`} tone="danger" highlight={economics.dueTotal > 0} />
        <KpiTile label="Credito" value={`${currency} ${economics.creditTotal.toFixed(2)}`} tone="success" />
      </div>
      {economics.projectedRoomRate > 0 && (
        <p className="mt-4 text-xs text-amber-400/90">
          Tariffa camera da prenotazione ({currency} {economics.projectedRoomRate.toFixed(2)}) — non ancora registrata come addebito folio.
        </p>
      )}
    </Card>
  );
}
