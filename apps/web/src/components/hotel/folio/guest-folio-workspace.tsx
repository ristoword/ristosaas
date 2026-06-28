"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CreditCard,
  Lock,
  Mail,
  Printer,
  RefreshCw,
  Unlock,
} from "lucide-react";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import { FolioHeaderBar } from "@/components/hotel/folio/folio-header-bar";
import { FolioGuestReservationPanels } from "@/components/hotel/folio/folio-guest-reservation-panels";
import { FolioEconomicDashboard } from "@/components/hotel/folio/folio-economic-dashboard";
import { useHotel } from "@/components/hotel/hotel-context";
import type { Customer, GuestFolio, HotelManualPaymentMethod } from "@/lib/api-client";
import {
  FOLIO_SECTIONS,
  type FolioChargeFilters,
  type FolioChargeRow,
  type FolioSplitId,
  type FolioTimelineEvent,
  buildTimeline,
  chargesForFolio,
  computeEconomics,
  customerForFolio,
  filterCharges,
  groupBySection,
  parsePaymentMethod,
  reservationForFolio,
  sectionLabel,
  splitTotals,
} from "@/lib/hotel/folio-utils";
import { cn } from "@/lib/utils";

type Props = {
  folio: GuestFolio;
  customers: Customer[];
  onRefresh: () => Promise<void>;
  locked: boolean;
  onToggleLock: () => void;
};

const DEFAULT_FILTERS: FolioChargeFilters = {
  query: "",
  dateFrom: "",
  dateTo: "",
  section: "all",
  operator: "",
  status: "all",
  amountMin: "",
  amountMax: "",
};

export function GuestFolioWorkspace({ folio, customers, onRefresh, locked, onToggleLock }: Props) {
  const { reservations, rooms, charges, ratePlans, recordFolioPayment, finalizeCheckout } = useHotel();
  const [filters, setFilters] = useState<FolioChargeFilters>(DEFAULT_FILTERS);
  const [tab, setTab] = useState<"conto" | "timeline" | "pagamenti" | "split">("conto");
  const [splitAssignments, setSplitAssignments] = useState<Record<string, FolioSplitId>>({});
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<HotelManualPaymentMethod>("carta");
  const [payNote, setPayNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const reservation = useMemo(() => reservationForFolio(folio, reservations), [folio, reservations]);
  const customer = useMemo(() => customerForFolio(folio, customers), [folio, customers]);
  const room = reservation ? rooms.find((r) => r.id === reservation.roomId) : null;
  const roomCode = folio.roomCode || room?.code || "—";

  const allRows = useMemo(() => chargesForFolio(charges, folio.id), [charges, folio.id]);
  const filteredRows = useMemo(() => filterCharges(allRows, filters), [allRows, filters]);
  const economics = useMemo(() => computeEconomics(allRows, folio, reservation), [allRows, folio, reservation]);
  const timeline = useMemo(() => buildTimeline(allRows, reservation), [allRows, reservation]);
  const bySection = useMemo(() => groupBySection(filteredRows.filter((r) => r.source !== "payment")), [filteredRows]);
  const payments = useMemo(() => allRows.filter((r) => r.source === "payment"), [allRows]);
  const splits = useMemo(() => splitTotals(allRows, splitAssignments), [allRows, splitAssignments]);

  const handlePay = async () => {
    if (!reservation || locked) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;
    setBusy(true);
    setMsg(null);
    try {
      await recordFolioPayment(reservation.id, amount, payMethod, payNote || undefined);
      await onRefresh();
      setPayOpen(false);
      setPayAmount("");
      setPayNote("");
      setMsg("Pagamento registrato.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Errore pagamento");
    } finally {
      setBusy(false);
    }
  };

  const handleCheckout = async (quick = false) => {
    if (!reservation || locked) return;
    if (!confirm(quick ? "Checkout rapido con saldo implicito?" : "Confermi checkout e chiusura folio?")) return;
    setBusy(true);
    try {
      await finalizeCheckout(reservation.id, 0, payMethod, {
        implicitFullPayment: quick,
        allowResidual: false,
      });
      await onRefresh();
      setMsg("Checkout completato.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Errore checkout");
    } finally {
      setBusy(false);
    }
  };

  const onDragAssign = useCallback((chargeId: string, split: FolioSplitId) => {
    setSplitAssignments((prev) => ({ ...prev, [chargeId]: split }));
  }, []);

  return (
    <div className="space-y-4">
      <FolioHeaderBar
        folio={folio}
        reservation={reservation}
        roomCode={roomCode}
        nights={reservation?.nights ?? 0}
        guestCount={reservation?.guests ?? 0}
      />

      <FolioGuestReservationPanels customer={customer} reservation={reservation} ratePlans={ratePlans} />
      <FolioEconomicDashboard economics={economics} currency={folio.currency} />

      <Card title="Azioni rapide">
        <div className="flex flex-wrap gap-2">
          <ActionBtn disabled={locked || !reservation} onClick={() => setPayOpen(true)} icon={CreditCard} label="Registra pagamento" />
          <ActionBtn disabled={locked || !reservation} onClick={() => handleCheckout(false)} icon={CreditCard} label="Checkout" />
          <ActionBtn disabled={locked || !reservation} onClick={() => handleCheckout(true)} icon={RefreshCw} label="Checkout rapido" />
          <ActionBtn onClick={onToggleLock} icon={locked ? Unlock : Lock} label={locked ? "Sblocca folio" : "Blocca folio"} />
          <ActionBtn onClick={() => window.print()} icon={Printer} label="Stampa folio" />
          <ActionBtn
            onClick={() => {
              const body = encodeURIComponent(`Folio ${folio.id} — Saldo ${folio.balance.toFixed(2)} ${folio.currency}`);
              window.location.href = `mailto:${customer?.email || reservation?.email || ""}?subject=Guest Folio&body=${body}`;
            }}
            icon={Mail}
            label="Invia email"
          />
          <Link href="/hotel/front-desk" className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs font-semibold text-rw-ink">
            Front Desk
          </Link>
          <Link href="/cassa" className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs font-semibold text-rw-ink">
            Addebito ristorante
          </Link>
        </div>
        {locked && (
          <p className="mt-2 flex items-center gap-2 text-xs text-amber-400">
            <Lock className="h-3.5 w-3.5" /> Folio bloccato — modifiche disabilitate in sessione.
          </p>
        )}
        {msg && <p className="mt-2 text-xs text-rw-soft">{msg}</p>}
      </Card>

      {payOpen && (
        <Card title="Registra pagamento">
          <div className="grid gap-3 sm:grid-cols-3">
            <input className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink" placeholder="Importo" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} type="number" min="0" step="0.01" />
            <select className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink" value={payMethod} onChange={(e) => setPayMethod(e.target.value as HotelManualPaymentMethod)}>
              <option value="carta">Carta / POS</option>
              <option value="contanti">Contanti</option>
              <option value="bonifico">Bonifico</option>
              <option value="altro">Voucher / Altro</option>
            </select>
            <input className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink" placeholder="Note" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy} onClick={handlePay} className="rounded-xl bg-rw-accent px-4 py-2 text-sm font-semibold text-white hover:bg-rw-accent/90 disabled:opacity-50">
              Conferma
            </button>
            <button type="button" onClick={() => setPayOpen(false)} className="rounded-xl border border-rw-line px-4 py-2 text-sm font-semibold text-rw-soft">
              Annulla
            </button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 border-b border-rw-line pb-2">
        {(["conto", "timeline", "pagamenti", "split"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-sm font-semibold capitalize",
              tab === t ? "bg-rw-accent/15 text-rw-accent" : "text-rw-muted hover:text-rw-ink",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <Card title="Ricerca e filtri">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink" placeholder="Descrizione, reparto…" value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} />
          <input className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink" type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
          <input className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink" type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
          <select className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink" value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value as FolioChargeFilters["section"] })}>
            <option value="all">Tutti i reparti</option>
            {FOLIO_SECTIONS.map((s) => (
              <option key={s} value={s}>
                {sectionLabel(s)}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {tab === "conto" && (
        <div className="space-y-4">
          {FOLIO_SECTIONS.map((section) => {
            const rows = bySection.get(section) ?? [];
            if (rows.length === 0) return null;
            return (
              <Card key={section} title={sectionLabel(section)} description={`${rows.length} movimenti`}>
                <ChargeTable rows={rows} />
              </Card>
            );
          })}
          {filteredRows.filter((r) => r.source !== "payment").length === 0 && (
            <p className="text-sm text-rw-muted">Nessun addebito nel folio selezionato.</p>
          )}
        </div>
      )}

      {tab === "timeline" && <FolioTimelineView events={timeline} />}

      {tab === "pagamenti" && (
        <Card title="Pagamenti">
          <DataTable
            columns={[
              { key: "date", header: "Data", render: (r) => `${r.date} ${r.time}` },
              { key: "method", header: "Metodo", render: (r) => parsePaymentMethod(r.description) },
              { key: "desc", header: "Descrizione", render: (r) => r.description },
              { key: "amount", header: "Importo", render: (r) => <span className="text-emerald-400">€ {r.amount.toFixed(2)}</span> },
            ]}
            data={payments}
            keyExtractor={(r) => r.id}
            emptyMessage="Nessun pagamento registrato"
          />
          <div className="mt-4 grid gap-2 sm:grid-cols-4 text-sm">
            <Stat label="Dovuto" value={economics.dueTotal} />
            <Stat label="Pagato" value={economics.paidTotal} positive />
            <Stat label="Saldo" value={economics.balance} />
            <Stat label="Credito" value={economics.creditTotal} positive />
          </div>
        </Card>
      )}

      {tab === "split" && (
        <Card title="Split Folio" description="Trascina gli addebiti tra Folio A–D (vista operativa sessione).">
          <div className="mb-4 grid gap-2 sm:grid-cols-4">
            {(["A", "B", "C", "D"] as FolioSplitId[]).map((id) => (
              <div key={id} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 text-center">
                <p className="text-xs text-rw-muted">Folio {id}</p>
                <p className="font-display text-lg font-semibold text-rw-ink">€ {splits[id].toFixed(2)}</p>
              </div>
            ))}
          </div>
          <SplitDropZones
            rows={allRows.filter((r) => r.source !== "payment")}
            assignments={splitAssignments}
            onAssign={onDragAssign}
          />
          <p className="mt-3 flex items-start gap-2 text-xs text-rw-muted">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Lo split è operativo in sessione. La persistenza multi-folio richiede estensione backend PMS.
          </p>
        </Card>
      )}

      <Card title="Audit movimenti" description="Tracciamento basato sui movimenti folio registrati (audit esteso IP/dispositivo: roadmap backend).">
        <ChargeTable rows={allRows.slice(0, 50)} compact />
      </Card>

      <Card title="Allegati">
        <p className="text-sm text-rw-muted">
          Upload documenti (passaporto, contratto, firma, voucher) disponibile con modulo documentale hotel — collegare storage tenant.
        </p>
      </Card>
    </div>
  );
}

function ChargeTable({ rows, compact }: { rows: FolioChargeRow[]; compact?: boolean }) {
  return (
    <DataTable
      columns={[
        { key: "date", header: "Data", render: (r) => r.date },
        { key: "time", header: "Ora", render: (r) => r.time },
        { key: "dept", header: "Reparto", render: (r) => r.department },
        { key: "desc", header: "Descrizione", render: (r) => r.description },
        ...(compact
          ? []
          : [
              { key: "qty", header: "Qtà", render: (r: FolioChargeRow) => r.qty },
              { key: "unit", header: "Prezzo", render: (r: FolioChargeRow) => `€ ${r.unitPrice.toFixed(2)}` },
              { key: "vat", header: "IVA", render: (r: FolioChargeRow) => `${r.vatPct}%` },
            ]),
        { key: "total", header: "Totale", render: (r) => <span className={r.amount < 0 ? "text-emerald-400" : ""}>€ {r.total.toFixed(2)}</span> },
        { key: "status", header: "Stato", render: (r) => r.status },
      ]}
      data={rows}
      keyExtractor={(r) => r.id}
      emptyMessage="Nessuna riga"
    />
  );
}

function FolioTimelineView({ events }: { events: FolioTimelineEvent[] }) {
  return (
    <Card title="Timeline soggiorno">
      <ul className="space-y-3">
        {events.map((ev) => (
          <li key={ev.id} className="flex gap-3 border-l-2 border-rw-accent/40 pl-4">
            <div>
              <p className="text-sm font-semibold text-rw-ink">{ev.title}</p>
              <p className="text-xs text-rw-soft">{ev.detail}</p>
              <p className="text-[10px] text-rw-muted">{new Date(ev.at).toLocaleString("it-IT")}</p>
            </div>
            {ev.amount != null && (
              <span className="ml-auto text-sm font-semibold text-rw-ink">€ {ev.amount.toFixed(2)}</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SplitDropZones({
  rows,
  assignments,
  onAssign,
}: {
  rows: FolioChargeRow[];
  assignments: Record<string, FolioSplitId>;
  onAssign: (chargeId: string, split: FolioSplitId) => void;
}) {
  const splits: FolioSplitId[] = ["A", "B", "C", "D"];
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {splits.map((split) => (
        <div
          key={split}
          className="min-h-[120px] rounded-2xl border border-dashed border-rw-line bg-rw-surfaceAlt/50 p-3"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const id = e.dataTransfer.getData("chargeId");
            if (id) onAssign(id, split);
          }}
        >
          <p className="mb-2 text-xs font-semibold uppercase text-rw-muted">Folio {split}</p>
          <ul className="space-y-1">
            {rows
              .filter((r) => (assignments[r.id] ?? "A") === split)
              .map((r) => (
                <li
                  key={r.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("chargeId", r.id)}
                  className="cursor-grab rounded-lg border border-rw-line bg-rw-surface px-2 py-1 text-xs"
                >
                  {r.description} — € {r.amount.toFixed(2)}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ActionBtn({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs font-semibold text-rw-ink transition hover:border-rw-accent/40 disabled:opacity-40"
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function Stat({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
      <p className="text-xs text-rw-muted">{label}</p>
      <p className={cn("font-semibold", positive ? "text-emerald-400" : "text-rw-ink")}>€ {value.toFixed(2)}</p>
    </div>
  );
}
