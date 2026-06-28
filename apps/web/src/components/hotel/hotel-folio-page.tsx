"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, Loader2, RefreshCw, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { useHotel } from "@/components/hotel/hotel-context";
import { GuestFolioWorkspace } from "@/components/hotel/folio/guest-folio-workspace";
import { customersApi, hotelFolioApi, roomServiceApi, type Customer, type FolioAttachmentEntry, type FolioAuditLogEntry, type GuestFolio } from "@/lib/api-client";
import { paymentStatusLabel, reservationForFolio } from "@/lib/hotel/folio-utils";
import { cn } from "@/lib/utils";

const POLL_MS = 30_000;

export function HotelFolioPage() {
  const { folios, charges, reservations, loading, failedSlices, refresh } = useHotel();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("open");
  const [pendingRoomService, setPendingRoomService] = useState(0);
  const [lockBusy, setLockBusy] = useState(false);

  useEffect(() => {
    customersApi.list().then(setCustomers).catch(() => setCustomers([]));
    roomServiceApi
      .list({ status: "delivered" })
      .then((orders) => setPendingRoomService(orders.filter((o) => !o.chargedToFolio).length))
      .catch(() => setPendingRoomService(0));
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const filteredFolios = useMemo(() => {
    const q = search.trim().toLowerCase();
    return folios
      .filter((f) => statusFilter === "all" || f.status === statusFilter)
      .filter((f) => {
        if (!q) return true;
        const res = reservationForFolio(f, reservations);
        const guest = f.guestName || res?.guestName || f.customerId;
        const room = f.roomCode || res?.roomId || "";
        return `${guest} ${room} ${f.id}`.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "open" ? -1 : 1;
        return b.balance - a.balance;
      });
  }, [folios, search, statusFilter, reservations]);

  useEffect(() => {
    if (!selectedId && filteredFolios.length > 0) {
      setSelectedId(filteredFolios[0].id);
    }
  }, [filteredFolios, selectedId]);

  const selected = folios.find((f) => f.id === selectedId) ?? null;

  const toggleLock = useCallback(async () => {
    if (!selected || lockBusy) return;
    setLockBusy(true);
    try {
      if (selected.locked) await hotelFolioApi.unlock(selected.id);
      else await hotelFolioApi.lock(selected.id);
      await refresh();
    } finally {
      setLockBusy(false);
    }
  }, [selected, lockBusy, refresh]);

  const integrationOk = !failedSlices.includes("folios") && !failedSlices.includes("charges");

  return (
    <div className="space-y-6 pb-10 print:space-y-2">
      <PageHeader
        title="Guest Folio"
        subtitle="Conto unico ospite PMS — hotel, ristorante, room service e pagamenti."
      >
        <button
          type="button"
          onClick={() => refresh()}
          className="inline-flex items-center gap-2 rounded-xl border border-rw-line px-3 py-2 text-sm font-semibold text-rw-ink hover:bg-rw-surfaceAlt"
        >
          <RefreshCw className="h-4 w-4" /> Aggiorna
        </button>
        <Chip label="Folio" value={folios.length} tone="accent" />
        <Chip label="Movimenti" value={charges.length} tone="info" />
        {pendingRoomService > 0 && (
          <Chip label="Room service da addebitare" value={pendingRoomService} tone="warn" />
        )}
      </PageHeader>

      {!integrationOk && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Alcuni dati folio non sono disponibili per il tuo ruolo. Contatta reception o supervisor.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4 space-y-3">
          <Card title="Folio attivi">
            <div className="mb-3 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                <input
                  className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt py-2 pl-8 pr-3 text-sm"
                  placeholder="Cerca ospite, camera…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "open" | "closed")}
              >
                <option value="open">Aperti</option>
                <option value="closed">Chiusi</option>
                <option value="all">Tutti</option>
              </select>
            </div>
            {loading && folios.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-rw-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <ul className="max-h-[70vh] space-y-2 overflow-y-auto">
                {filteredFolios.map((f) => (
                  <FolioListItem
                    key={f.id}
                    folio={f}
                    reservation={reservationForFolio(f, reservations)}
                    selected={f.id === selectedId}
                    onSelect={() => setSelectedId(f.id)}
                  />
                ))}
                {filteredFolios.length === 0 && (
                  <li className="py-6 text-center text-sm text-rw-muted">Nessun folio trovato</li>
                )}
              </ul>
            )}
          </Card>
          <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 text-xs text-rw-muted">
            <CreditCard className="mb-2 h-4 w-4 text-rw-accent" />
            Aggiornamento automatico ogni 30s. Addebiti da cassa, bar e room service confluiscono nel folio selezionato.
          </div>
        </div>

        <div className="xl:col-span-8">
          {selected ? (
            <GuestFolioWorkspace
              folio={selected}
              customers={customers}
              onRefresh={refresh}
              locked={selected.locked ?? false}
              onToggleLock={toggleLock}
              lockBusy={lockBusy}
            />
          ) : (
            <Card title="Seleziona un folio">
              <p className="text-sm text-rw-muted">Scegli un ospite dalla lista per visualizzare il conto completo.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function FolioListItem({
  folio,
  reservation,
  selected,
  onSelect,
}: {
  folio: GuestFolio;
  reservation: ReturnType<typeof reservationForFolio>;
  selected: boolean;
  onSelect: () => void;
}) {
  const pay = paymentStatusLabel(folio.balance, folio.status);
  const guest = folio.guestName || reservation?.guestName || folio.customerId;
  const room = folio.roomCode || reservation?.roomId?.replace("hr_", "") || "—";

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "w-full rounded-2xl border p-3 text-left transition",
          selected ? "border-rw-accent/50 bg-rw-accent/10" : "border-rw-line bg-rw-surfaceAlt hover:border-rw-accent/30",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-rw-ink">{guest}</p>
            <p className="text-xs text-rw-muted">Cam. {room}</p>
          </div>
          <p className="font-display text-sm font-semibold text-rw-ink">€ {folio.balance.toFixed(2)}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="rounded-full bg-rw-surface px-2 py-0.5 text-[10px] font-semibold uppercase text-rw-muted">
            {folio.status}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              pay.tone === "success" && "bg-emerald-500/15 text-emerald-400",
              pay.tone === "warn" && "bg-amber-500/15 text-amber-400",
              pay.tone === "danger" && "bg-red-500/15 text-red-400",
              pay.tone === "default" && "bg-rw-surface text-rw-muted",
            )}
          >
            {pay.label}
          </span>
        </div>
      </button>
    </li>
  );
}
