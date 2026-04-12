"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Info, Send } from "lucide-react";
import { tablesApi } from "@/lib/api-client";
import type { SalaTable } from "@/lib/api-client";
import { useHotel } from "@/components/hotel/hotel-context";
import { tenantPlatformProfile } from "@/core/tenant/platform-config";
import { SalaFloor } from "./sala-floor";
import { TableActionsModal } from "./table-actions-modal";
import { OrderSendModal } from "./order-send-modal";
import { useOrders } from "@/components/orders/orders-context";
import type { Order } from "@/components/orders/types";

export function SalaPage() {
  const [tables, setTables] = useState<SalaTable[]>([]);
  const [selected, setSelected] = useState<SalaTable | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderModalTable, setOrderModalTable] = useState<SalaTable | null>(null);
  const [chargeReservationId, setChargeReservationId] = useState<Record<string, string>>({});
  const { getOrdersForTable, patchActiveCourse, activeOrders } = useOrders();
  const { reservations, roomCharge } = useHotel();
  const roomChargeEnabled =
    tenantPlatformProfile.enabledFeatures.includes("restaurant") &&
    tenantPlatformProfile.enabledFeatures.includes("hotel") &&
    tenantPlatformProfile.enabledFeatures.includes("integration_room_charge");

  useEffect(() => {
    tablesApi.list().then(setTables).catch(console.error);
  }, []);

  const selectedId = selected?.id ?? null;

  const legend = useMemo(
    () => [
      { stato: "libero" as const, text: "Libero" },
      { stato: "aperto" as const, text: "Aperto" },
      { stato: "conto" as const, text: "Conto" },
      { stato: "sporco" as const, text: "Da pulire" },
    ],
    [],
  );

  function openTable(t: SalaTable) {
    setSelected(t);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function openOrderModal(t: SalaTable) {
    setOrderModalTable(t);
    setOrderModalOpen(true);
    setModalOpen(false);
  }

  function handleMarcia(order: Order) {
    const courseNums = [...new Set(order.items.map((i) => i.course))].sort((a, b) => a - b);
    const currentIdx = courseNums.indexOf(order.activeCourse);
    if (currentIdx < courseNums.length - 1) {
      patchActiveCourse(order.id, courseNums[currentIdx + 1]);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-rw-ink md:text-3xl">
            Sala
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-rw-muted md:text-base">
            Planimetria touch: tocca un tavolo, scegli cosa fare. Invia comande con corsi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-rw-line bg-rw-surface px-4 py-3 text-xs text-rw-muted shadow-sm">
          <Info className="h-4 w-4 shrink-0 text-rw-accent" aria-hidden />
          <span>Ordini attivi: {activeOrders.length}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-rw-line bg-rw-surfaceAlt px-4 py-3">
        <span className="w-full text-xs font-semibold uppercase tracking-wide text-rw-muted sm:w-auto sm:self-center">
          Legenda
        </span>
        <ul className="flex flex-wrap gap-2">
          {legend.map(({ stato, text }) => (
            <li key={stato}>
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${chipClass(stato)}`}>
                <span className="h-2 w-2 rounded-full bg-current opacity-70" />
                {text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Active orders by table with course status */}
      {activeOrders.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {activeOrders.map((order) => {
            const courseNums = [...new Set(order.items.map((i) => i.course))].sort((a, b) => a - b);
            return (
              <div key={order.id} className="rounded-2xl border border-rw-line bg-rw-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-bold text-rw-ink">
                    Tav. {order.table}
                  </span>
                  <span className="text-xs text-rw-muted">{order.waiter} · {order.covers}p</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {courseNums.map((cn) => {
                    const st = order.courseStates[String(cn)] ?? "queued";
                    const isActive = cn === order.activeCourse;
                    return (
                      <span
                        key={cn}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${courseChipClass(st, isActive)}`}
                      >
                        {cn}° corso
                        <span className="opacity-70">
                          {st === "servito" ? "servito" : st === "pronto" ? "pronto" : st === "in_preparazione" ? "in prep" : st === "in_attesa" ? "in coda" : "attesa turno"}
                        </span>
                      </span>
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleMarcia(order)}
                    disabled={courseNums.indexOf(order.activeCourse) >= courseNums.length - 1}
                    className="flex-1 rounded-xl border border-rw-accent/30 bg-rw-accent/10 px-3 py-2 text-xs font-bold text-rw-accent transition hover:bg-rw-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send className="mr-1 inline h-3.5 w-3.5" />
                    Marcia
                  </button>
                </div>
                {roomChargeEnabled && order.status === "in_attesa" ? (
                  <div className="mt-3 space-y-2 rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">Addebita su camera</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <select
                        className="min-w-0 flex-1 rounded-xl border border-rw-line bg-rw-surface px-3 py-2 text-sm text-rw-ink"
                        value={chargeReservationId[order.id] || ""}
                        onChange={(e) => setChargeReservationId((prev) => ({ ...prev, [order.id]: e.target.value }))}
                      >
                        <option value="">Seleziona ospite in casa</option>
                        {reservations.filter((reservation) => reservation.status === "in_casa").map((reservation) => (
                          <option key={reservation.id} value={reservation.id}>
                            {reservation.guestName} · camera {reservation.roomId?.replace("hr_", "") || "n/d"}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="rounded-xl border border-rw-accent/30 bg-rw-accent/10 px-3 py-2 text-xs font-bold text-rw-accent transition hover:bg-rw-accent/20 disabled:opacity-40"
                        disabled={!chargeReservationId[order.id]}
                        onClick={() => {
                          const total = order.items.reduce((sum, item) => sum + (item.price ?? 0) * item.qty, 0);
                          roomCharge(chargeReservationId[order.id]!, order.id, `Addebito comanda tavolo ${order.table}`, total, "dinner").catch(console.error);
                        }}
                      >
                        <CreditCard className="mr-1 inline h-3.5 w-3.5" />
                        Room charge
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <SalaFloor
        tables={tables}
        selectedId={modalOpen ? selectedId : null}
        onSelect={openTable}
      />

      <TableActionsModal
        table={selected}
        open={modalOpen}
        onClose={closeModal}
        onSendOrder={openOrderModal}
      />

      <OrderSendModal
        table={orderModalTable}
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
      />
    </div>
  );
}

function chipClass(stato: SalaTable["stato"]) {
  switch (stato) {
    case "libero":
      return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
    case "aperto":
      return "border-rw-accent/30 bg-rw-accent/15 text-rw-accentSoft";
    case "conto":
      return "border-amber-500/30 bg-amber-500/15 text-amber-300";
    default:
      return "border-slate-500/30 bg-slate-500/15 text-slate-300";
  }
}

function courseChipClass(st: string, isActive: boolean) {
  if (st === "servito") return "border-slate-500/20 bg-slate-500/10 text-slate-400";
  if (st === "pronto") return "border-emerald-500/40 bg-emerald-500/20 text-emerald-300";
  if (st === "in_preparazione") return "border-rw-accent/40 bg-rw-accent/20 text-rw-accentSoft";
  if (isActive) return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  return "border-red-500/30 bg-red-500/10 text-red-400";
}
