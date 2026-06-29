"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, Loader2, RefreshCw, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { StatusPill } from "@/components/shared/status-pill";
import { useHotel } from "@/components/hotel/hotel-context";
import { GuestFolioWorkspace } from "@/components/hotel/folio/guest-folio-workspace";
import { useFolioStream } from "@/components/hotel/folio/use-folio-stream";
import { customersApi, hotelFolioApi, roomServiceApi, type Customer, type GuestFolio } from "@/lib/api-client";
import { folioPaymentStatusKey, reservationForFolio } from "@/lib/hotel/folio-utils";
import { useI18n } from "@/core/i18n/provider";
import { useI10n } from "@/core/i18n/formatters";
import { ALERT_WARN, BTN_GHOST, INPUT_CLASS, SELECT_CLASS } from "@/components/shared/ui-classes";
import { cn } from "@/lib/utils";

export function HotelFolioPage() {
  const { t } = useI18n();
  const { formatCurrency } = useI10n();
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

  useFolioStream({ onUpdate: refresh });

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
      <PageHeader title={t("hotel.folio.page.title")} subtitle={t("hotel.folio.page.subtitle")}>
        <button type="button" onClick={() => refresh()} className={BTN_GHOST}>
          <RefreshCw className="h-4 w-4" /> {t("ui.update")}
        </button>
        <Chip label={t("hotel.folio.chip.folio")} value={folios.length} tone="accent" />
        <Chip label={t("hotel.folio.chip.movements")} value={charges.length} tone="info" />
        {pendingRoomService > 0 && (
          <Chip label={t("hotel.folio.chip.roomServicePending")} value={pendingRoomService} tone="warn" />
        )}
      </PageHeader>

      {!integrationOk && <div className={ALERT_WARN}>{t("hotel.folio.alert.partial")}</div>}

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4 space-y-3">
          <Card title={t("hotel.folio.list.title")}>
            <div className="mb-3 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                <input
                  className={cn(INPUT_CLASS, "pl-8")}
                  placeholder={t("hotel.folio.list.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className={cn(SELECT_CLASS, "w-auto shrink-0")}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "open" | "closed")}
              >
                <option value="open">{t("hotel.folio.list.status.open")}</option>
                <option value="closed">{t("hotel.folio.list.status.closed")}</option>
                <option value="all">{t("hotel.folio.list.status.all")}</option>
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
                    formatCurrency={formatCurrency}
                  />
                ))}
                {filteredFolios.length === 0 && (
                  <li className="py-6 text-center text-sm text-rw-muted">{t("hotel.folio.list.empty")}</li>
                )}
              </ul>
            )}
          </Card>
          <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 text-xs text-rw-muted">
            <CreditCard className="mb-2 h-4 w-4 text-rw-accent" />
            {t("hotel.folio.info.sse")}
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
            <Card title={t("hotel.folio.select.title")}>
              <p className="text-sm text-rw-muted">{t("hotel.folio.select.desc")}</p>
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
  formatCurrency,
}: {
  folio: GuestFolio;
  reservation: ReturnType<typeof reservationForFolio>;
  selected: boolean;
  onSelect: () => void;
  formatCurrency: (n: number) => string;
}) {
  const { t } = useI18n();
  const pay = folioPaymentStatusKey(folio.balance, folio.status);
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
            <p className="text-xs text-rw-muted">
              {t("hotel.folio.list.room")} {room}
            </p>
          </div>
          <p className="font-display text-sm font-semibold text-rw-ink">{formatCurrency(folio.balance)}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <StatusPill tone={folio.status === "open" ? "accent" : "default"}>
            {t(`hotel.folio.status.${folio.status}`)}
          </StatusPill>
          <StatusPill tone={pay.tone === "default" ? "default" : pay.tone}>{t(pay.key)}</StatusPill>
        </div>
      </button>
    </li>
  );
}
