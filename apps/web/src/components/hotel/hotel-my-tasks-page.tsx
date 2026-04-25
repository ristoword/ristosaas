"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/components/auth/auth-context";
import {
  roomServiceApi,
  type RoomServiceCategory,
  type RoomServiceItem,
  type RoomServiceOrder,
  type RoomServiceStatus,
} from "@/lib/api-client";
import { CATEGORY_META, STATUS_META } from "@/components/hotel/hotel-room-service-page";

const euro = (n: number) => `€ ${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_FLOW: RoomServiceStatus[] = ["pending", "in_preparation", "out_for_delivery", "delivered"];

const btnPrimary = "inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98] disabled:opacity-50";
const btnGhost = "inline-flex items-center gap-2 rounded-xl border border-rw-line px-3 py-2 text-sm font-medium text-rw-muted transition hover:bg-rw-surfaceAlt hover:text-rw-ink";

const ROLE_CATEGORIES: Record<string, RoomServiceCategory[]> = {
  housekeeping: ["laundry", "linen"],
  staff:        ["shoe_cleaning", "amenities", "transport", "minibar", "other"],
  reception:    ["food", "laundry", "minibar", "shoe_cleaning", "linen", "amenities", "transport", "other"],
  hotel_manager: ["food", "laundry", "minibar", "shoe_cleaning", "linen", "amenities", "transport", "other"],
};

export function HotelMyTasksPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<RoomServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const myCats = useMemo<RoomServiceCategory[]>(() => {
    if (!user?.role) return [];
    return ROLE_CATEGORIES[user.role] ?? ROLE_CATEGORIES.staff;
  }, [user]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const rows = await roomServiceApi.list();
      setOrders(rows);
    } catch (e) { setError(e instanceof Error ? e.message : "Errore caricamento"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => void load(true), 30_000);
    return () => clearInterval(t);
  }, [load]);

  const myTasks = useMemo(() =>
    orders.filter((o) =>
      !["delivered", "cancelled"].includes(o.status) && myCats.includes(o.category),
    ),
    [orders, myCats],
  );

  const completedToday = useMemo(() =>
    orders.filter((o) =>
      o.status === "delivered" &&
      myCats.includes(o.category) &&
      o.deliveredAt?.slice(0, 10) === new Date().toISOString().slice(0, 10),
    ),
    [orders, myCats],
  );

  async function handleStatusChange(id: string, status: RoomServiceStatus) {
    const updated = await roomServiceApi.update(id, { status }).catch((e: Error) => { setError(e.message); return null; });
    if (updated) setOrders((prev) => prev.map((o) => o.id === id ? updated : o));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-rw-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-3" /> Caricamento incarichi…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="I miei incarichi"
        subtitle="Richieste di servizio assegnate al tuo reparto."
      >
        <button type="button" onClick={() => void load(true)} disabled={refreshing} className={btnGhost}>
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Aggiorna
        </button>
      </PageHeader>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
          <p className="text-sm text-rw-muted">In attesa / In corso</p>
          <p className="mt-2 font-display text-3xl font-semibold text-rw-accent">{myTasks.length}</p>
        </div>
        <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
          <p className="text-sm text-rw-muted">Completati oggi</p>
          <p className="mt-2 font-display text-3xl font-semibold text-emerald-400">{completedToday.length}</p>
        </div>
      </div>

      {myTasks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-rw-line bg-rw-surfaceAlt py-16">
          <Check className="h-10 w-10 text-emerald-400" />
          <p className="text-sm font-semibold text-rw-ink">Nessun incarico pendente!</p>
          <p className="text-xs text-rw-muted">Tutti i servizi del tuo reparto sono stati gestiti.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-rw-muted uppercase tracking-wide">Da gestire</h2>
          {myTasks.map((order) => {
            const meta = CATEGORY_META[order.category];
            const statusMeta = STATUS_META[order.status];
            const Icon = meta.icon;
            const currentIdx = STATUS_FLOW.indexOf(order.status);
            const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

            return (
              <div key={order.id} className="rounded-2xl border border-rw-line bg-rw-bg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", meta.color)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-rw-ink">Camera {order.roomCode}</span>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", statusMeta.color)}>
                        {statusMeta.label}
                      </span>
                      <span className="text-xs text-rw-muted">{meta.label}</span>
                    </div>
                    <p className="text-xs text-rw-muted truncate">{order.guestName}</p>
                  </div>
                  <span className="text-sm font-bold text-rw-ink shrink-0">{euro(order.total)}</span>
                </div>

                <div className="space-y-0.5 pl-13">
                  {(order.items as RoomServiceItem[]).map((it, i) => (
                    <div key={i} className="flex justify-between text-xs text-rw-muted">
                      <span>{it.qty}× {it.name}</span>
                      <span>{euro(it.qty * it.unitPrice)}</span>
                    </div>
                  ))}
                </div>

                {order.notes && <p className="text-xs text-rw-muted italic pl-13">"{order.notes}"</p>}

                <div className="flex items-center justify-between text-[11px] text-rw-muted pl-13">
                  <span>Richiesto alle {new Date(order.requestedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>

                {nextStatus && (
                  <button
                    type="button"
                    onClick={() => void handleStatusChange(order.id, nextStatus)}
                    className={btnPrimary}
                  >
                    <Check className="h-4 w-4" />
                    {nextStatus === "delivered" ? "Segna come consegnato" : `Avanza: ${STATUS_META[nextStatus].label}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {completedToday.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-rw-muted uppercase tracking-wide">Completati oggi</h2>
          {completedToday.map((order) => {
            const meta = CATEGORY_META[order.category];
            const Icon = meta.icon;
            return (
              <div key={order.id} className="rounded-2xl border border-rw-line/40 bg-rw-bg/60 p-4 opacity-70">
                <div className="flex items-center gap-3">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", meta.color)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-rw-ink">Camera {order.roomCode} — {meta.label}</p>
                    <p className="text-xs text-rw-muted">
                      {order.guestName} · Consegnato {order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </p>
                  </div>
                  <span className="ml-auto text-sm font-bold text-emerald-400">{euro(order.total)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
