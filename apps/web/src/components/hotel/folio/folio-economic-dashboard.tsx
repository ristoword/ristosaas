"use client";

import type { FolioEconomics } from "@/lib/hotel/folio-utils";
import { Card } from "@/components/shared/card";

export function FolioEconomicDashboard({ economics, currency }: { economics: FolioEconomics; currency: string }) {
  const tiles = [
    { label: "Totale camera", value: economics.roomTotal + economics.projectedRoomRate, color: "text-rw-ink" },
    { label: "Totale extra", value: economics.extraTotal, color: "text-rw-ink" },
    { label: "Totale tasse", value: economics.taxTotal, color: "text-amber-400" },
    { label: "IVA stimata", value: economics.vatTotal, color: "text-rw-muted" },
    { label: "Pagato", value: economics.paidTotal, color: "text-emerald-400" },
    { label: "Da pagare", value: economics.dueTotal, color: "text-red-400" },
    { label: "Credito", value: economics.creditTotal, color: "text-emerald-400" },
  ];

  const max = Math.max(1, ...tiles.map((t) => Math.abs(t.value)));

  return (
    <Card title="Dashboard economica">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-rw-muted">{t.label}</p>
            <p className={`mt-1 font-display text-lg font-semibold ${t.color}`}>
              {currency} {t.value.toFixed(2)}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rw-line">
              <div
                className="h-full rounded-full bg-rw-accent/70"
                style={{ width: `${Math.min(100, (Math.abs(t.value) / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {economics.projectedRoomRate > 0 && (
        <p className="mt-3 text-xs text-amber-400/90">
          Tariffa camera da prenotazione (€ {economics.projectedRoomRate.toFixed(2)}) — non ancora registrata come addebito folio.
        </p>
      )}
    </Card>
  );
}
