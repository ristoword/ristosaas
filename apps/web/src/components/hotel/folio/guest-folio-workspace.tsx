"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Download,
  Lock,
  Mail,
  Paperclip,
  Plus,
  Printer,
  RefreshCw,
  Unlock,
} from "lucide-react";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import { Modal } from "@/components/shared/modal";
import { TabBar } from "@/components/shared/tab-bar";
import { BTN_GHOST, BTN_OUTLINE, BTN_PRIMARY, folioWorkspaceGrid, INPUT_CLASS, SELECT_CLASS, STAT_GRID } from "@/components/shared/ui-classes";
import { FolioHeaderBar } from "@/components/hotel/folio/folio-header-bar";
import { FolioGuestReservationPanels } from "@/components/hotel/folio/folio-guest-reservation-panels";
import { FolioEconomicDashboard } from "@/components/hotel/folio/folio-economic-dashboard";
import { useHotel } from "@/components/hotel/hotel-context";
import type { Customer, FolioAttachmentEntry, FolioAuditLogEntry, GuestFolio, HotelManualPaymentMethod } from "@/lib/api-client";
import { hotelFolioApi } from "@/lib/api-client";
import {
  FOLIO_SECTIONS,
  type FolioChargeFilters,
  type FolioChargeRow,
  type FolioSection,
  type FolioSplitId,
  type FolioTimelineEvent,
  buildTimeline,
  chargesForFolio,
  computeEconomics,
  customerForFolio,
  filterCharges,
  groupBySection,
  reservationForFolio,
  folioPaymentMethodKey,
  folioSectionKey,
  folioTimelineTitleKey,
  splitTotals,
} from "@/lib/hotel/folio-utils";
import { tf } from "@/core/i18n/interpolate";
import { useI10n } from "@/core/i18n/formatters";
import { useI18n } from "@/core/i18n/provider";
import { translateApiError } from "@/core/i18n/translate-api-error";
import { FolioAiPanel, FolioAiToggle } from "@/components/hotel/folio/folio-ai-panel";
import { cn } from "@/lib/utils";

type Props = {
  folio: GuestFolio;
  customers: Customer[];
  onRefresh: () => Promise<void>;
  locked: boolean;
  onToggleLock: () => Promise<void>;
  lockBusy?: boolean;
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

export function GuestFolioWorkspace({ folio, customers, onRefresh, locked, onToggleLock, lockBusy }: Props) {
  const { t } = useI18n();
  const { formatCurrency, formatDateTime } = useI10n();
  const { reservations, rooms, charges, ratePlans, recordFolioPayment, finalizeCheckout } = useHotel();
  const [filters, setFilters] = useState<FolioChargeFilters>(DEFAULT_FILTERS);
  const [tab, setTab] = useState<"conto" | "timeline" | "pagamenti" | "split">("conto");
  const [splitAssignments, setSplitAssignments] = useState<Record<string, FolioSplitId>>({});
  const [auditLogs, setAuditLogs] = useState<FolioAuditLogEntry[]>([]);
  const [attachments, setAttachments] = useState<FolioAttachmentEntry[]>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeDesc, setChargeDesc] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeSection, setChargeSection] = useState<FolioSection>("EXTRA");
  const [chargeVat, setChargeVat] = useState("10");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<HotelManualPaymentMethod>("carta");
  const [payNote, setPayNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(true);
  const [aiCheckoutBlocked, setAiCheckoutBlocked] = useState(false);
  const [aiCheckoutReasons, setAiCheckoutReasons] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    hotelFolioApi
      .getDetail(folio.id)
      .then((detail) => {
        if (cancelled) return;
        setAuditLogs(detail.auditLogs);
        setAttachments(detail.attachments);
      })
      .catch(() => {
        if (!cancelled) {
          setAuditLogs([]);
          setAttachments([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [folio.id, charges.length]);

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
  const splits = useMemo(() => {
    const totals = splitTotals(allRows, splitAssignments);
    const keys = Object.keys(totals);
    if (!keys.includes("A")) keys.unshift("A");
    return { totals, keys: keys.length ? keys : ["A"] };
  }, [allRows, splitAssignments]);

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
      setMsg(t("hotel.folio.msg.paymentOk"));
    } catch (e) {
      setMsg(translateApiError(e instanceof Error ? e.message : t("hotel.folio.msg.paymentErr"), t));
    } finally {
      setBusy(false);
    }
  };

  const handleAddCharge = async () => {
    if (locked) return;
    const amount = parseFloat(chargeAmount);
    if (!chargeDesc.trim() || !amount || amount <= 0) return;
    setBusy(true);
    setMsg(null);
    try {
      await hotelFolioApi.postCharge({
        folioId: folio.id,
        description: chargeDesc.trim(),
        amount,
        section: chargeSection,
        vatPct: parseFloat(chargeVat) || 10,
        source: "manual",
      });
      await onRefresh();
      setChargeOpen(false);
      setChargeDesc("");
      setChargeAmount("");
      setMsg(t("hotel.folio.msg.chargeOk"));
    } catch (e) {
      setMsg(translateApiError(e instanceof Error ? e.message : t("hotel.folio.msg.chargeErr"), t));
    } finally {
      setBusy(false);
    }
  };

  const handleCheckout = async (quick = false) => {
    if (!reservation || locked) return;
    if (aiCheckoutBlocked) {
      setMsg(tf(t, "hotel.folio.msg.checkoutBlocked", { reasons: aiCheckoutReasons.join("; ") }));
      return;
    }
    if (!confirm(quick ? t("hotel.folio.msg.checkoutQuickConfirm") : t("hotel.folio.msg.checkoutConfirm"))) return;
    setBusy(true);
    try {
      await finalizeCheckout(reservation.id, 0, payMethod, {
        implicitFullPayment: quick,
        allowResidual: false,
      });
      await onRefresh();
      setMsg(t("hotel.folio.msg.checkoutOk"));
    } catch (e) {
      setMsg(translateApiError(e instanceof Error ? e.message : t("hotel.folio.msg.checkoutErr"), t));
    } finally {
      setBusy(false);
    }
  };

  const onDragAssign = useCallback(
    async (chargeId: string, split: FolioSplitId) => {
      if (locked) return;
      setSplitAssignments((prev) => ({ ...prev, [chargeId]: split }));
      try {
        await hotelFolioApi.patchCharge(chargeId, "split", { splitCode: split });
        await onRefresh();
      } catch (e) {
        setMsg(translateApiError(e instanceof Error ? e.message : t("hotel.folio.msg.splitErr"), t));
      }
    },
    [locked, onRefresh],
  );

  const handleExportPdf = async () => {
    setBusy(true);
    try {
      const blob = await hotelFolioApi.exportPdf(folio.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `folio-${folio.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMsg(translateApiError(e instanceof Error ? e.message : t("hotel.folio.msg.exportPdfErr"), t));
    } finally {
      setBusy(false);
    }
  };

  const handleUploadAttachment = async (file: File) => {
    if (locked) return;
    setBusy(true);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const type =
        file.type.startsWith("image/") ? "photo" : file.type === "application/pdf" ? "contract" : "document";
      await hotelFolioApi.uploadAttachment(folio.id, {
        type,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        dataBase64,
      });
      const detail = await hotelFolioApi.getDetail(folio.id);
      setAttachments(detail.attachments);
      setAuditLogs(detail.auditLogs);
      setMsg(t("hotel.folio.msg.attachmentOk"));
    } catch (e) {
      setMsg(translateApiError(e instanceof Error ? e.message : t("hotel.folio.msg.uploadErr"), t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={folioWorkspaceGrid(aiOpen)}>
      <section className="[grid-area:summary] min-w-0 space-y-6">
      <div className="flex justify-end">
        <FolioAiToggle onClick={() => setAiOpen((v) => !v)} collapsed={!aiOpen} />
      </div>
      <FolioHeaderBar
        folio={folio}
        reservation={reservation}
        roomCode={roomCode}
        nights={reservation?.nights ?? 0}
        guestCount={reservation?.guests ?? 0}
      />

      <FolioGuestReservationPanels customer={customer} reservation={reservation} ratePlans={ratePlans} />
      <FolioEconomicDashboard economics={economics} currency={folio.currency} />
      </section>

      {aiOpen && (
        <section className="[grid-area:ai] min-w-0 min-[1600px]:sticky min-[1600px]:top-4 min-[1600px]:self-start">
        <FolioAiPanel
          folio={folio}
          reservation={reservation}
          customer={customer}
          onOpenPayment={() => setPayOpen(true)}
          onCheckout={() => void handleCheckout(false)}
          onExportPdf={() => void handleExportPdf()}
          onEmail={async () => {
            const email = customer?.email || reservation?.email;
            if (!email) {
              setMsg(t("hotel.folio.msg.emailMissing"));
              return;
            }
            try {
              await hotelFolioApi.email(folio.id, email);
              setMsg(tf(t, "hotel.folio.msg.emailSent", { email }));
            } catch (e) {
              setMsg(translateApiError(e instanceof Error ? e.message : t("hotel.folio.msg.emailErr"), t));
            }
          }}
          onToggleCollapse={() => setAiOpen(false)}
          onAnalysis={(a) => {
            setAiCheckoutBlocked(a.checkoutBlocked);
            setAiCheckoutReasons(a.checkoutBlockReasons);
          }}
        />
        </section>
      )}

      <section className="[grid-area:ledger] min-w-0 space-y-6">
      <Card title={t("hotel.folio.actions.title")}>
        <div className="flex flex-wrap gap-2">
          <ActionBtn disabled={locked} onClick={() => setChargeOpen(true)} icon={Plus} label={t("hotel.folio.actions.addCharge")} />
          <ActionBtn disabled={locked || !reservation} onClick={() => setPayOpen(true)} icon={CreditCard} label={t("hotel.folio.actions.pay")} />
          <ActionBtn disabled={locked || !reservation} onClick={() => handleCheckout(false)} icon={CreditCard} label={t("hotel.folio.actions.checkout")} />
          <ActionBtn disabled={locked || !reservation} onClick={() => handleCheckout(true)} icon={RefreshCw} label={t("hotel.folio.actions.quickCheckout")} />
          <ActionBtn disabled={lockBusy} onClick={() => void onToggleLock()} icon={locked ? Unlock : Lock} label={locked ? t("hotel.folio.actions.unlock") : t("hotel.folio.actions.lock")} />
          <ActionBtn onClick={() => void handleExportPdf()} icon={Download} label={t("hotel.folio.actions.exportPdf")} />
          <ActionBtn
            onClick={async () => {
              try {
                const blob = await hotelFolioApi.exportExcel(folio.id);
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `folio-${folio.id}.xls`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (e) {
                setMsg(translateApiError(e instanceof Error ? e.message : t("hotel.folio.msg.exportExcelErr"), t));
              }
            }}
            icon={Download}
            label={t("hotel.folio.actions.exportExcel")}
          />
          <ActionBtn
            onClick={async () => {
              const email = customer?.email || reservation?.email;
              if (!email) {
                setMsg(t("hotel.folio.msg.emailMissing"));
                return;
              }
              try {
                await hotelFolioApi.email(folio.id, email);
                setMsg(tf(t, "hotel.folio.msg.emailSent", { email }));
              } catch (e) {
                setMsg(translateApiError(e instanceof Error ? e.message : t("hotel.folio.msg.emailErr"), t));
              }
            }}
            icon={Mail}
            label={t("hotel.folio.actions.emailPdf")}
          />
          <ActionBtn onClick={() => window.print()} icon={Printer} label={t("hotel.folio.actions.print")} />
          <ActionBtn
            onClick={() => {
              const body = encodeURIComponent(`Folio ${folio.id} — ${formatCurrency(folio.balance)}`);
              window.location.href = `mailto:${customer?.email || reservation?.email || ""}?subject=${encodeURIComponent(t("hotel.folio.page.title"))}&body=${body}`;
            }}
            icon={Mail}
            label={t("hotel.folio.actions.email")}
          />
          <Link href="/hotel/front-desk" className={BTN_GHOST}>
            {t("hotel.folio.actions.frontDesk")}
          </Link>
          <Link href="/cassa" className={BTN_GHOST}>
            {t("hotel.folio.actions.restaurantCharge")}
          </Link>
        </div>
        {locked && (
          <p className="mt-2 flex items-center gap-2 text-xs text-amber-400">
            <Lock className="h-3.5 w-3.5" /> {t("hotel.folio.actions.locked")}
          </p>
        )}
        {msg && <p className="mt-2 text-xs text-rw-soft">{msg}</p>}
      </Card>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={t("hotel.folio.pay.title")}>
        <div className="grid gap-3 sm:grid-cols-1">
          <input className={INPUT_CLASS} placeholder={t("hotel.folio.pay.amount")} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} type="number" min="0" step="0.01" />
          <select className={SELECT_CLASS} value={payMethod} onChange={(e) => setPayMethod(e.target.value as HotelManualPaymentMethod)}>
            <option value="carta">{t("hotel.folio.pay.method.card")}</option>
            <option value="contanti">{t("hotel.folio.pay.method.cash")}</option>
            <option value="bonifico">{t("hotel.folio.pay.method.transfer")}</option>
            <option value="altro">{t("hotel.folio.pay.method.other")}</option>
          </select>
          <input className={INPUT_CLASS} placeholder={t("hotel.folio.pay.note")} value={payNote} onChange={(e) => setPayNote(e.target.value)} />
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" disabled={busy} onClick={handlePay} className={cn(BTN_PRIMARY, "w-full sm:w-auto")}>
            {t("ui.confirm")}
          </button>
          <button type="button" onClick={() => setPayOpen(false)} className={cn(BTN_OUTLINE, "w-full sm:w-auto")}>
            {t("ui.cancel")}
          </button>
        </div>
      </Modal>

      <Modal open={chargeOpen} onClose={() => setChargeOpen(false)} title={t("hotel.folio.charge.title")}>
        <div className="grid gap-3">
          <input className={INPUT_CLASS} placeholder={t("hotel.folio.charge.description")} value={chargeDesc} onChange={(e) => setChargeDesc(e.target.value)} />
          <input className={INPUT_CLASS} type="number" min="0" step="0.01" placeholder={t("hotel.folio.charge.amount")} value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} />
          <select className={SELECT_CLASS} value={chargeSection} onChange={(e) => setChargeSection(e.target.value as FolioSection)}>
            {FOLIO_SECTIONS.filter((s) => s !== "SCONTI" && s !== "RIMBORSI").map((s) => (
              <option key={s} value={s}>{t(folioSectionKey(s))}</option>
            ))}
          </select>
          <input className={INPUT_CLASS} type="number" min="0" max="22" step="1" placeholder={t("hotel.folio.charge.vat")} value={chargeVat} onChange={(e) => setChargeVat(e.target.value)} />
          <p className="text-[11px] text-rw-muted">{t("hotel.folio.charge.vatHint")}</p>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" disabled={busy} onClick={() => void handleAddCharge()} className={cn(BTN_PRIMARY, "w-full sm:w-auto")}>
            {t("ui.confirm")}
          </button>
          <button type="button" onClick={() => setChargeOpen(false)} className={cn(BTN_OUTLINE, "w-full sm:w-auto")}>
            {t("ui.cancel")}
          </button>
        </div>
      </Modal>

      <TabBar
        tabs={[
          { id: "conto", label: t("hotel.folio.tab.account") },
          { id: "timeline", label: t("hotel.folio.tab.timeline") },
          { id: "pagamenti", label: t("hotel.folio.tab.payments") },
          { id: "split", label: t("hotel.folio.tab.split") },
        ]}
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
      />

      <Card title={t("hotel.folio.filters.title")}>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
          <input className={INPUT_CLASS} placeholder={t("hotel.folio.filters.query")} value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} />
          <input className={INPUT_CLASS} type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
          <input className={INPUT_CLASS} type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
          <select className={SELECT_CLASS} value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value as FolioChargeFilters["section"] })}>
            <option value="all">{t("hotel.folio.filters.allSections")}</option>
            {FOLIO_SECTIONS.map((s) => (
              <option key={s} value={s}>
                {t(folioSectionKey(s))}
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
              <Card key={section} title={t(folioSectionKey(section))} description={tf(t, "hotel.folio.charges.movements", { n: rows.length })}>
                <ChargeTable rows={rows} />
              </Card>
            );
          })}
          {filteredRows.filter((r) => r.source !== "payment").length === 0 && (
            <p className="text-sm text-rw-muted">{t("hotel.folio.charges.empty")}</p>
          )}
        </div>
      )}

      {tab === "timeline" && <FolioTimelineView events={timeline} />}

      {tab === "pagamenti" && (
        <Card title={t("hotel.folio.payments.title")}>
          <DataTable
            stickyHeader
            columns={[
              { key: "date", header: t("hotel.folio.col.date"), render: (r) => formatDateTime(r.postedAt) },
              { key: "method", header: t("hotel.folio.col.method"), render: (r) => t(folioPaymentMethodKey(r.description)) },
              { key: "desc", header: t("hotel.folio.col.desc"), render: (r) => r.description },
              { key: "amount", header: t("hotel.folio.col.total"), render: (r) => <span className="text-emerald-400">{formatCurrency(r.amount)}</span> },
            ]}
            data={payments}
            keyExtractor={(r) => r.id}
            emptyMessage={t("hotel.folio.payments.empty")}
          />
          <div className={cn(STAT_GRID, "mt-4 text-sm")}>
            <Stat label={t("hotel.folio.payments.due")} value={economics.dueTotal} />
            <Stat label={t("hotel.folio.payments.paid")} value={economics.paidTotal} positive />
            <Stat label={t("hotel.folio.payments.balance")} value={economics.balance} />
            <Stat label={t("hotel.folio.payments.credit")} value={economics.creditTotal} positive />
          </div>
        </Card>
      )}

      {tab === "split" && (
        <Card title={t("hotel.folio.split.title")} description={t("hotel.folio.split.desc")}>
          <div className={cn(STAT_GRID, "mb-4")}>
            {splits.keys.map((id) => (
              <div key={id} className="min-w-[10rem] rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 text-center">
                <p className="text-xs text-rw-muted">{tf(t, "hotel.folio.split.label", { id })}</p>
                <p className="font-display text-lg font-semibold text-rw-ink">{formatCurrency(splits.totals[id] ?? 0)}</p>
              </div>
            ))}
          </div>
          <SplitDropZones
            rows={allRows.filter((r) => r.source !== "payment" && r.status !== "void")}
            assignments={splitAssignments}
            onAssign={(id, split) => void onDragAssign(id, split)}
          />
        </Card>
      )}

      <Card title={t("hotel.folio.audit.title")} description={t("hotel.folio.audit.desc")}>
        <DataTable
          stickyHeader
          columns={[
            { key: "at", header: t("hotel.folio.col.date"), render: (r) => formatDateTime(r.createdAt) },
            { key: "action", header: t("hotel.folio.col.action"), render: (r) => r.action },
            { key: "user", header: t("hotel.folio.col.operator"), render: (r) => r.userName || "—" },
            { key: "detail", header: t("hotel.folio.col.detail"), render: (r) => r.newValue || r.oldValue || "—" },
            { key: "ip", header: t("hotel.folio.col.ip"), render: (r) => r.ip || "—" },
          ]}
          data={auditLogs}
          keyExtractor={(r) => r.id}
          emptyMessage={t("hotel.folio.audit.empty")}
        />
      </Card>

      <Card title={t("hotel.folio.attachments.title")}>
        <div className="flex flex-wrap items-center gap-3">
          <label className={cn(BTN_OUTLINE, "cursor-pointer px-3 py-2 text-sm")}>
            <Paperclip className="h-4 w-4" /> {t("hotel.folio.attachments.upload")}
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
              disabled={locked || busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUploadAttachment(file);
                e.target.value = "";
              }}
            />
          </label>
          {attachments.length === 0 && <p className="text-sm text-rw-muted">{t("hotel.folio.attachments.empty")}</p>}
        </div>
        {attachments.length > 0 && (
          <ul className="mt-3 space-y-2">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm">
                <span>{a.fileName}</span>
                <span className="text-xs text-rw-muted">
                  {a.type} · {(a.fileSize / 1024).toFixed(0)} KB
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      </section>
    </div>
  );
}

function ChargeTable({ rows, compact }: { rows: FolioChargeRow[]; compact?: boolean }) {
  const { t } = useI18n();
  const { formatCurrency } = useI10n();
  return (
    <DataTable
      stickyHeader
      columns={[
        { key: "date", header: t("hotel.folio.col.date"), render: (r) => r.date },
        { key: "time", header: t("hotel.folio.col.time"), render: (r) => r.time },
        { key: "dept", header: t("hotel.folio.col.dept"), render: (r) => r.department },
        { key: "desc", header: t("hotel.folio.col.desc"), render: (r) => r.description },
        ...(compact
          ? []
          : [
              { key: "qty", header: t("hotel.folio.col.qty"), render: (r: FolioChargeRow) => r.qty },
              { key: "unit", header: t("hotel.folio.col.unit"), render: (r: FolioChargeRow) => formatCurrency(r.unitPrice) },
              { key: "vat", header: t("hotel.folio.col.vat"), render: (r: FolioChargeRow) => `${r.vatPct}%` },
            ]),
        { key: "total", header: t("hotel.folio.col.total"), render: (r) => <span className={r.amount < 0 ? "text-emerald-400" : ""}>{formatCurrency(r.total)}</span> },
        { key: "status", header: t("hotel.folio.col.status"), render: (r) => r.status },
      ]}
      data={rows}
      keyExtractor={(r) => r.id}
      emptyMessage={t("hotel.folio.col.empty")}
    />
  );
}

function FolioTimelineView({ events }: { events: FolioTimelineEvent[] }) {
  const { t } = useI18n();
  const { formatCurrency, formatDateTime } = useI10n();
  return (
    <Card title={t("hotel.folio.timeline.title")}>
      <ul className="space-y-3">
        {events.map((ev) => (
          <li key={ev.id} className="flex gap-3 border-l-2 border-rw-accent/40 pl-4">
            <div>
              <p className="text-sm font-semibold text-rw-ink">
                {ev.kind === "check_in" || ev.kind === "check_out" || ev.kind === "payment"
                  ? t(folioTimelineTitleKey(ev.kind))
                  : t(folioSectionKey(ev.title as FolioChargeRow["section"])) || ev.title}
              </p>
              <p className="text-xs text-rw-soft">
                {ev.detailKey
                  ? tf(t, ev.detailKey, ev.detailParams ?? {})
                  : ev.detail}
              </p>
              <p className="text-[10px] text-rw-muted">{formatDateTime(ev.at)}</p>
            </div>
            {ev.amount != null && (
              <span className="ml-auto text-sm font-semibold text-rw-ink">{formatCurrency(ev.amount)}</span>
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
  const { t } = useI18n();
  const { formatCurrency } = useI10n();
  const discovered = new Set<string>(["A", "B", "C", "D", "COMPANY"]);
  for (const row of rows) discovered.add(assignments[row.id] ?? row.split);
  const splitKeys = [...discovered];
  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))]">
      {splitKeys.map((split) => (
        <div
          key={split}
          className="min-h-[120px] rounded-2xl border border-dashed border-rw-line bg-rw-surfaceAlt/50 p-3"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const id = e.dataTransfer.getData("chargeId");
            if (id) onAssign(id, split);
          }}
        >
          <p className="mb-2 text-xs font-semibold uppercase text-rw-muted">{tf(t, "hotel.folio.split.label", { id: split })}</p>
          <ul className="space-y-1">
            {rows
              .filter((r) => (assignments[r.id] ?? r.split) === split)
              .map((r) => (
                <li
                  key={r.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("chargeId", r.id)}
                  className="cursor-grab rounded-lg border border-rw-line bg-rw-surface px-2 py-1 text-xs"
                >
                  {r.description} — {formatCurrency(r.amount)}
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
      className={cn(BTN_OUTLINE, "px-3 py-2 text-sm")}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function Stat({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  const { formatCurrency } = useI10n();
  return (
    <div className="min-w-[10rem] rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
      <p className="text-xs text-rw-muted [overflow-wrap:anywhere]">{label}</p>
      <p className={cn("font-semibold tabular-nums [overflow-wrap:anywhere]", positive ? "text-emerald-400" : "text-rw-ink")}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}
