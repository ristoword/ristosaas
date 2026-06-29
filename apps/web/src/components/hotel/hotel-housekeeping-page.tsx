"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, ShirtIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { useHotel } from "@/components/hotel/hotel-context";
import { roomServiceApi, type RoomServiceItem, type RoomServiceOrder } from "@/lib/api-client";
import { HousekeepingEnterpriseDashboard } from "@/components/hotel/housekeeping/housekeeping-enterprise-dashboard";
import { useI18n } from "@/core/i18n/provider";
import { useI10n } from "@/core/i18n/formatters";

const taskTone = {
  todo: "warn",
  in_progress: "info",
  done: "success",
} as const;

export function HotelHousekeepingPage() {
  const { housekeeping, rooms } = useHotel();
  const { t } = useI18n();
  const { formatCurrency } = useI10n();
  const [rsOrders, setRsOrders] = useState<RoomServiceOrder[]>([]);
  const [rsLoading, setRsLoading] = useState(true);

  const euro = (n: number) => formatCurrency(n);

  useEffect(() => {
    roomServiceApi.list({ category: "laundry" }).then((laundry) =>
      roomServiceApi.list({ category: "linen" }).then((linen) => {
        setRsOrders([...laundry, ...linen]);
        setRsLoading(false);
      })
    ).catch(() => setRsLoading(false));
    const timer = setInterval(() => {
      Promise.all([
        roomServiceApi.list({ category: "laundry" }),
        roomServiceApi.list({ category: "linen" }),
      ]).then(([a, b]) => setRsOrders([...a, ...b])).catch(() => {});
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  const rsActive = rsOrders.filter((o) => !["delivered", "cancelled"].includes(o.status));

  async function handleRsStatus(id: string, status: "in_preparation" | "delivered") {
    const updated = await roomServiceApi.update(id, { status }).catch(() => null);
    if (updated) setRsOrders((prev) => prev.map((o) => o.id === id ? updated : o));
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title={t("hotel.housekeeping.title")} subtitle={t("hotel.housekeeping.subtitle")}>
        <Chip label={t("hotel.housekeeping.chip.open")} value={housekeeping.filter((item) => item.status !== "done").length} tone="warn" />
        {rsActive.length > 0 && (
          <Chip label={`${t("hotel.housekeeping.chip.laundry")} (${rsActive.length})`} tone="info" />
        )}
      </PageHeader>

      <HousekeepingEnterpriseDashboard />

      {(rsActive.length > 0 || rsLoading) && (
        <Card title={t("hotel.housekeeping.laundry_card.title")} description={t("hotel.housekeeping.laundry_card.desc")}>
          {rsLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-rw-muted"><Loader2 className="h-4 w-4 animate-spin" />{t("hotel.housekeeping.loading")}</div>
          ) : rsActive.length === 0 ? (
            <p className="py-4 text-center text-sm text-rw-muted">{t("hotel.housekeeping.laundry_empty")}</p>
          ) : (
            <div className="space-y-3">
              {rsActive.map((o) => (
                <div key={o.id} className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShirtIcon className="h-4 w-4 text-blue-400" />
                      <span className="font-bold text-rw-ink">{t("hotel.housekeeping.room")} {o.roomCode}</span>
                      <span className="text-xs text-rw-muted">{o.guestName}</span>
                      <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                        {o.category === "laundry" ? t("hotel.housekeeping.cat.laundry") : t("hotel.housekeeping.cat.linen")}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-rw-ink">{euro(o.total)}</span>
                  </div>
                  <div className="space-y-0.5">
                    {(o.items as RoomServiceItem[]).map((it, i) => (
                      <p key={i} className="text-xs text-rw-muted">{it.qty}× {it.name}</p>
                    ))}
                  </div>
                  <div className={cn("flex gap-2")}>
                    {o.status === "pending" && (
                      <button type="button" onClick={() => void handleRsStatus(o.id, "in_preparation")}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-500/15 px-3 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-500/25 transition">
                        {t("hotel.housekeeping.take_charge")}
                      </button>
                    )}
                    {o.status === "in_preparation" && (
                      <button type="button" onClick={() => void handleRsStatus(o.id, "delivered")}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 transition">
                        <Check className="h-3.5 w-3.5" />{t("hotel.housekeeping.done")}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card title={t("hotel.housekeeping.queue.title")} description={t("hotel.housekeeping.queue.desc")}>
        <DataTable
          stickyHeader
          columns={[
            {
              key: "roomId",
              header: t("hotel.housekeeping.col.room"),
              render: (row) => {
                const room = rooms.find((item) => item.id === row.roomId);
                return <span className="font-semibold text-rw-ink">{room?.code || row.roomId}</span>;
              },
            },
            { key: "assignedTo", header: t("hotel.housekeeping.col.assigned"), render: (row) => <span className="text-rw-ink">{row.assignedTo}</span> },
            { key: "scheduledFor", header: t("hotel.housekeeping.col.date"), render: (row) => <span className="text-rw-soft">{row.scheduledFor}</span> },
            { key: "status", header: t("hotel.housekeeping.col.status"), render: (row) => <Chip label={row.status.replace("_", " ")} tone={taskTone[row.status]} /> },
            { key: "inspected", header: t("hotel.housekeeping.col.inspection"), render: (row) => <span className="text-rw-soft">{row.inspected ? t("hotel.housekeeping.inspection.ok") : t("hotel.housekeeping.inspection.pending")}</span> },
          ]}
          data={housekeeping}
          keyExtractor={(row) => row.id}
        />
      </Card>
    </div>
  );
}
