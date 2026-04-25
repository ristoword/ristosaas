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

const taskTone = {
  todo: "warn",
  in_progress: "info",
  done: "success",
} as const;

const euro = (n: number) => `€ ${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function HotelHousekeepingPage() {
  const { housekeeping, rooms } = useHotel();
  const [rsOrders, setRsOrders] = useState<RoomServiceOrder[]>([]);
  const [rsLoading, setRsLoading] = useState(true);

  useEffect(() => {
    roomServiceApi.list({ category: "laundry" }).then((laundry) =>
      roomServiceApi.list({ category: "linen" }).then((linen) => {
        setRsOrders([...laundry, ...linen]);
        setRsLoading(false);
      })
    ).catch(() => setRsLoading(false));
    const t = setInterval(() => {
      Promise.all([
        roomServiceApi.list({ category: "laundry" }),
        roomServiceApi.list({ category: "linen" }),
      ]).then(([a, b]) => setRsOrders([...a, ...b])).catch(() => {});
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  const rsActive = rsOrders.filter((o) => !["delivered", "cancelled"].includes(o.status));

  async function handleRsStatus(id: string, status: "in_preparation" | "delivered") {
    const updated = await roomServiceApi.update(id, { status }).catch(() => null);
    if (updated) setRsOrders((prev) => prev.map((o) => o.id === id ? updated : o));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Housekeeping" subtitle="Pulizie, ispezioni e camere bloccate per manutenzione.">
        <Chip label="Task aperti" value={housekeeping.filter((item) => item.status !== "done").length} tone="warn" />
        {rsActive.length > 0 && (
          <Chip label={`Lavanderia/Linen (${rsActive.length})`} tone="info" />
        )}
      </PageHeader>

      {/* Room service laundry/linen requests */}
      {(rsActive.length > 0 || rsLoading) && (
        <Card title="Lavanderia & Biancheria — Room Service" description="Richieste in camera assegnate all'housekeeping">
          {rsLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-rw-muted"><Loader2 className="h-4 w-4 animate-spin" />Caricamento…</div>
          ) : rsActive.length === 0 ? (
            <p className="py-4 text-center text-sm text-rw-muted">Nessuna richiesta lavanderia/biancheria in corso.</p>
          ) : (
            <div className="space-y-3">
              {rsActive.map((o) => (
                <div key={o.id} className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShirtIcon className="h-4 w-4 text-blue-400" />
                      <span className="font-bold text-rw-ink">Camera {o.roomCode}</span>
                      <span className="text-xs text-rw-muted">{o.guestName}</span>
                      <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                        {o.category === "laundry" ? "Lavanderia" : "Biancheria"}
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
                        Prendi in carico
                      </button>
                    )}
                    {o.status === "in_preparation" && (
                      <button type="button" onClick={() => void handleRsStatus(o.id, "delivered")}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 transition">
                        <Check className="h-3.5 w-3.5" />Completato
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card title="Coda housekeeping" description="Vista operativa per camere da pulire, pronte o in manutenzione.">
        <DataTable
          columns={[
            {
              key: "roomId",
              header: "Camera",
              render: (row) => {
                const room = rooms.find((item) => item.id === row.roomId);
                return <span className="font-semibold text-rw-ink">{room?.code || row.roomId}</span>;
              },
            },
            { key: "assignedTo", header: "Assegnato a", render: (row) => <span className="text-rw-ink">{row.assignedTo}</span> },
            { key: "scheduledFor", header: "Data", render: (row) => <span className="text-rw-soft">{row.scheduledFor}</span> },
            { key: "status", header: "Stato", render: (row) => <Chip label={row.status.replace("_", " ")} tone={taskTone[row.status]} /> },
            { key: "inspected", header: "Ispezione", render: (row) => <span className="text-rw-soft">{row.inspected ? "OK" : "Da verificare"}</span> },
          ]}
          data={housekeeping}
          keyExtractor={(row) => row.id}
        />
      </Card>
    </div>
  );
}
