"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, Info, Minus, Move, Plus, Send } from "lucide-react";
import { roomsApi, tablesApi } from "@/lib/api-client";
import type { SalaTable } from "@/lib/api-client";
import { useHotel } from "@/components/hotel/hotel-context";
import { useTenantFeatures } from "@/components/auth/auth-context";
import { SalaFloor } from "./sala-floor";
import { TableActionsModal, type AzioneId } from "./table-actions-modal";
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
  const { getOrdersForTable, patchActiveCourse, patchStatus, activeOrders } = useOrders();
  const { reservations, roomCharge } = useHotel();
  const { isRestaurantEnabled, isHotelEnabled, isRoomChargeEnabled } = useTenantFeatures();
  const roomChargeEnabled = isRestaurantEnabled && isHotelEnabled && isRoomChargeEnabled;

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

  const refreshTables = useCallback(async () => {
    try {
      const list = await tablesApi.list();
      setTables(list);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const MAX_TABLES = 30;
  const [tablesBusy, setTablesBusy] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [editLayout, setEditLayout] = useState(false);

  const handleLocalMove = useCallback((id: string, x: number, y: number) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, x, y } : t)));
  }, []);

  const handleCommitMove = useCallback(
    async (id: string, x: number, y: number) => {
      try {
        await tablesApi.update(id, { x, y });
      } catch (err) {
        setTablesError(
          err instanceof Error
            ? `Spostamento tavolo non salvato: ${err.message}`
            : "Spostamento tavolo non salvato",
        );
        // ricarica la verità dal server
        await refreshTables();
      }
    },
    [refreshTables],
  );

  // Distribuzione percentuale in griglia 5 x N, coerente col seed.
  function percentPositionForIndex(index: number) {
    const cols = 5;
    const leftPad = 12;
    const rightPad = 12;
    const topPad = 18;
    const rowGap = 24;
    const usableWidth = 100 - leftPad - rightPad;
    const colStep = usableWidth / (cols - 1);
    const row = Math.floor(index / cols);
    const col = index % cols;
    return {
      x: Math.round(leftPad + col * colStep),
      y: Math.round(topPad + row * rowGap),
    };
  }

  async function handleAddTable() {
    if (tables.length >= MAX_TABLES) return;
    setTablesError(null);
    setTablesBusy(true);
    try {
      const room = await roomsApi.ensureDefault();
      const usedIndexes = new Set(
        tables
          .map((t) => t.nome.trim().toUpperCase())
          .filter((name) => /^T\d+$/.test(name))
          .map((name) => Number(name.slice(1))),
      );
      let nextIndex = 1;
      while (usedIndexes.has(nextIndex)) nextIndex += 1;

      const pos = percentPositionForIndex(tables.length);
      await tablesApi.create({
        nome: `T${nextIndex}`,
        posti: 4,
        x: pos.x,
        y: pos.y,
        forma: tables.length % 2 === 0 ? "quadrato" : "tondo",
        stato: "libero",
        roomId: room.id,
      });
      await refreshTables();
    } catch (err) {
      setTablesError(err instanceof Error ? err.message : "Errore aggiunta tavolo");
    } finally {
      setTablesBusy(false);
    }
  }

  async function handleRemoveTable() {
    if (tables.length === 0) return;
    // Cerca il tavolo "alto": priorità tavoli liberi, altrimenti ultimo creato.
    const candidate =
      [...tables].reverse().find((t) => t.stato === "libero") ?? tables[tables.length - 1];
    if (!candidate) return;

    const ordersOnTable = getOrdersForTable(candidate.nome);
    if (ordersOnTable.length > 0) {
      setTablesError(`${candidate.nome} ha ordini attivi: chiudili prima di rimuoverlo.`);
      return;
    }

    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm(`Rimuovere ${candidate.nome}? L'azione non si può annullare.`);
    if (!confirmed) return;

    setTablesError(null);
    setTablesBusy(true);
    try {
      await tablesApi.delete(candidate.id);
      await refreshTables();
    } catch (err) {
      setTablesError(err instanceof Error ? err.message : "Errore rimozione tavolo");
    } finally {
      setTablesBusy(false);
    }
  }

  async function handleTableAction(id: AzioneId, t: SalaTable) {
    const ordersForTable = getOrdersForTable(t.nome);
    switch (id) {
      case "apri-tavolo": {
        await tablesApi.patchStatus(t.id, "aperto").catch(console.error);
        await refreshTables();
        break;
      }
      case "tavolo-libero": {
        await tablesApi.patchStatus(t.id, "libero").catch(console.error);
        await refreshTables();
        break;
      }
      case "chiedi-conto": {
        await tablesApi.patchStatus(t.id, "conto").catch(console.error);
        await refreshTables();
        break;
      }
      case "marcia-portata": {
        for (const order of ordersForTable) {
          await handleMarcia(order);
        }
        break;
      }
      case "chiudi-tavolo": {
        for (const order of ordersForTable) {
          await patchStatus(order.id, "chiuso").catch(console.error);
        }
        await tablesApi.patchStatus(t.id, "sporco").catch(console.error);
        await refreshTables();
        break;
      }
      case "cancella-tavolo": {
        for (const order of ordersForTable) {
          await patchStatus(order.id, "annullato").catch(console.error);
        }
        await tablesApi.patchStatus(t.id, "libero").catch(console.error);
        await refreshTables();
        break;
      }
    }
  }

  async function handleMarcia(order: Order) {
    const courseNums = [...new Set(order.items.map((i) => i.course))].sort((a, b) => a - b);
    const currentCourse = order.activeCourse;
    const currentState = order.courseStates[String(currentCourse)];
    const isLastCourse =
      courseNums.indexOf(currentCourse) === courseNums.length - 1;

    // Portata corrente non ancora pronta: avviamo la preparazione.
    if (currentState === "queued" || currentState === "in_attesa") {
      await patchActiveCourse(order.id, currentCourse).catch(console.error);
      return;
    }
    // Portata già in preparazione o pronta: chiudi come servita
    // (l'API /status avanza automaticamente al corso successivo in_attesa).
    if (currentState === "pronto" || currentState === "in_preparazione") {
      if (!isLastCourse) {
        await patchStatus(order.id, "servito").catch(console.error);
        return;
      }
      // Ultima portata già pronta: la sala la marca servita (tavolo da chiudere).
      await patchStatus(order.id, "servito").catch(console.error);
      return;
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

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-rw-line bg-rw-surface px-4 py-3 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-rw-muted">
          Gestione tavoli
        </span>
        <span className="text-sm text-rw-ink">
          {tables.length} tavoli attivi
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditLayout((v) => !v)}
            aria-pressed={editLayout}
            className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition ${
              editLayout
                ? "border-rw-accent bg-rw-accent text-white shadow-rw-sm"
                : "border-rw-line bg-rw-surfaceAlt text-rw-ink hover:border-rw-accent/40 hover:bg-rw-accent/10"
            }`}
            aria-label="Attiva modalità layout per spostare i tavoli"
          >
            <Move className="h-4 w-4" aria-hidden />
            {editLayout ? "Esci dal layout" : "Sposta tavoli"}
          </button>
          <button
            type="button"
            onClick={handleRemoveTable}
            disabled={tablesBusy || tables.length === 0 || editLayout}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 text-sm font-semibold text-rw-ink transition hover:border-red-500/40 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Rimuovi tavolo libero"
          >
            <Minus className="h-4 w-4" aria-hidden />
            Rimuovi
          </button>
          <button
            type="button"
            onClick={handleAddTable}
            disabled={tablesBusy || tables.length >= MAX_TABLES || editLayout}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-rw-accent px-3 text-sm font-semibold text-white shadow-rw-sm transition hover:bg-rw-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Aggiungi tavolo"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Aggiungi tavolo
          </button>
        </div>
        {tablesError ? (
          <p className="w-full text-sm font-medium text-red-300" role="alert">
            {tablesError}
          </p>
        ) : null}
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
        editMode={editLayout}
        onLocalMove={handleLocalMove}
        onCommitMove={handleCommitMove}
      />

      <TableActionsModal
        table={selected}
        open={modalOpen}
        onClose={closeModal}
        onSendOrder={openOrderModal}
        onAction={handleTableAction}
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
