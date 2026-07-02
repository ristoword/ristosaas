"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Globe,
  Loader2,
  Monitor,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { KpiTile } from "@/components/shared/kpi-tile";
import { Modal } from "@/components/shared/modal";
import { HotelRoomTypeSelect } from "@/components/hotel/hotel-room-type-select";
import { useHotel } from "@/components/hotel/hotel-context";
import {
  hotelApi,
  type BookingListResponse,
  type BookingListStats,
  type HotelBookingChannel,
  type HotelReservation,
  type HotelReservationStatus,
  type RatePlan,
} from "@/lib/api-client";
import { addDaysIso, nightsBetweenIso, todayIso } from "@/lib/date-utils";
import {
  HOTEL_BOOKING_CHANNELS,
  canCancel,
  canCheckIn,
  canConfirm,
  defaultStatusForChannel,
} from "@/lib/hotel/booking-list";
import { stayTotalFromNightly } from "@/lib/hotel/pricing";
import { ALERT_INFO, BTN_GHOST, BTN_OUTLINE, BTN_PRIMARY, INPUT_CLASS, KPI_GRID, SELECT_CLASS } from "@/components/shared/ui-classes";
import { tf } from "@/core/i18n/interpolate";
import { useI10n } from "@/core/i18n/formatters";
import { useI18n } from "@/core/i18n/provider";
import { translateApiError } from "@/core/i18n/translate-api-error";

const CHANNEL_ICONS: Record<HotelBookingChannel, typeof Globe> = {
  online: Globe,
  desk: Monitor,
  agency: Building2,
  voucher: Ticket,
};

const STATUS_TONE = {
  in_attesa: "warn",
  confermata: "success",
  cancellata: "danger",
  no_show: "default",
} as const;

function emptyForm(today: string): Omit<HotelReservation, "id"> {
  const out = addDaysIso(today, 2);
  return {
    customerId: `cst_${Date.now()}`,
    guestName: "",
    phone: "",
    email: "",
    roomId: null,
    checkInDate: today,
    checkOutDate: out,
    guests: 2,
    status: "confermata",
    roomType: "CLASSIC",
    boardType: "bed_breakfast",
    nights: nightsBetweenIso(today, out),
    rate: 0,
    documentCode: "",
    channel: "desk",
    voucherCode: null,
  };
}

type Filters = {
  status: HotelReservationStatus | "all";
  channel: HotelBookingChannel | "all";
  search: string;
  dateFrom: string;
  dateTo: string;
  includeCancelled: boolean;
};

export function HotelBookingListPage() {
  const { t } = useI18n();
  const { formatCurrency } = useI10n();
  const { refresh: refreshHotel } = useHotel();
  const today = todayIso();

  const [filters, setFilters] = useState<Filters>({
    status: "all",
    channel: "all",
    search: "",
    dateFrom: today,
    dateTo: addDaysIso(today, 30),
    includeCancelled: false,
  });
  const [data, setData] = useState<BookingListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<HotelReservation, "id">>(() => emptyForm(today));
  const [availability, setAvailability] = useState<{ ratePlans: RatePlan[] } | null>(null);

  const nightsComputed = useMemo(
    () => nightsBetweenIso(form.checkInDate, form.checkOutDate),
    [form.checkInDate, form.checkOutDate],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await hotelApi.listBookingSheet({
        status: filters.status,
        channel: filters.channel,
        search: filters.search || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        includeCancelled: filters.includeCancelled,
        page: 1,
        pageSize: 100,
      });
      setData(result);
    } catch (e) {
      setMsg(translateApiError(e instanceof Error ? e.message : t("hotel.bookingList.loadErr"), t));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    hotelApi
      .availability({
        roomType: form.roomType,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
      })
      .then((r) => setAvailability({ ratePlans: r.ratePlans }))
      .catch(() => setAvailability(null));
  }, [form.roomType, form.checkInDate, form.checkOutDate]);

  const stats: BookingListStats | null = data?.stats ?? null;

  const channelLabel = (ch: HotelBookingChannel) => t(`hotel.bookingList.channel.${ch}`);
  const statusLabel = (st: HotelReservationStatus) => t(`hotel.bookingList.status.${st}`);

  const openCreate = (channel: HotelBookingChannel = "desk") => {
    const base = emptyForm(todayIso());
    setEditingId(null);
    setForm({ ...base, channel, status: defaultStatusForChannel(channel) });
    setModalOpen(true);
  };

  const openEdit = (row: HotelReservation) => {
    setEditingId(row.id);
    setForm({
      customerId: row.customerId,
      guestName: row.guestName,
      phone: row.phone,
      email: row.email,
      roomId: row.roomId,
      checkInDate: row.checkInDate,
      checkOutDate: row.checkOutDate,
      guests: row.guests,
      status: row.status,
      roomType: row.roomType,
      boardType: row.boardType,
      nights: row.nights,
      rate: row.rate,
      documentCode: row.documentCode,
      nationality: row.nationality,
      address: row.address,
      company: row.company,
      channel: row.channel ?? "desk",
      voucherCode: row.voucherCode ?? null,
      children: row.children,
      crib: row.crib,
      depositReceived: row.depositReceived,
      receptionNotes: row.receptionNotes,
      packageName: row.packageName,
      ratePlanName: row.ratePlanName,
    });
    setModalOpen(true);
  };

  const saveForm = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const payload = { ...form, nights: nightsComputed, roomId: form.roomId || null };
      if (editingId) {
        await hotelApi.updateReservation(editingId, payload);
        setMsg(t("hotel.bookingList.msg.updated"));
      } else {
        await hotelApi.createReservation(payload);
        setMsg(t("hotel.bookingList.msg.created"));
      }
      setModalOpen(false);
      await Promise.all([load(), refreshHotel()]);
    } catch (e) {
      setMsg(translateApiError(e instanceof Error ? e.message : t("hotel.bookingList.msg.saveErr"), t));
    } finally {
      setBusy(false);
    }
  };

  const patchStatus = async (id: string, status: HotelReservationStatus) => {
    setBusy(true);
    try {
      await hotelApi.updateReservation(id, { status });
      setMsg(t("hotel.bookingList.msg.statusOk"));
      await Promise.all([load(), refreshHotel()]);
    } catch (e) {
      setMsg(translateApiError(e instanceof Error ? e.message : t("hotel.bookingList.msg.statusErr"), t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title={t("hotel.bookingList.title")} subtitle={t("hotel.bookingList.subtitle")}>
        <button type="button" onClick={() => void load()} className={BTN_GHOST} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("ui.update")}
        </button>
        <button type="button" onClick={() => openCreate("desk")} className={BTN_PRIMARY}>
          <Plus className="h-4 w-4" /> {t("hotel.bookingList.new")}
        </button>
      </PageHeader>

      {msg && <div className={ALERT_INFO}>{msg}</div>}

      {stats && (
        <div className={KPI_GRID}>
          <KpiTile label={t("hotel.bookingList.kpi.active")} value={stats.inAttesa + stats.confermata} />
          <KpiTile label={t("hotel.bookingList.kpi.pending")} value={stats.inAttesa} tone="warn" />
          <KpiTile label={t("hotel.bookingList.kpi.confirmed")} value={stats.confermata} tone="success" />
          <KpiTile label={t("hotel.bookingList.kpi.arrivalsToday")} value={stats.arrivalsToday} tone="info" />
          <KpiTile label={t("hotel.bookingList.kpi.online")} value={stats.byChannel.online} />
          <KpiTile label={t("hotel.bookingList.kpi.desk")} value={stats.byChannel.desk} />
          <KpiTile label={t("hotel.bookingList.kpi.agency")} value={stats.byChannel.agency} />
          <KpiTile label={t("hotel.bookingList.kpi.voucher")} value={stats.byChannel.voucher} />
        </div>
      )}

      <Card title={t("hotel.bookingList.filters.title")}>
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
            <input
              className={`${INPUT_CLASS} pl-9`}
              placeholder={t("hotel.bookingList.filters.search")}
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <input type="date" className={INPUT_CLASS} value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
          <input type="date" className={INPUT_CLASS} value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm text-rw-soft">
            <input
              type="checkbox"
              checked={filters.includeCancelled}
              onChange={(e) => setFilters((f) => ({ ...f, includeCancelled: e.target.checked }))}
            />
            {t("hotel.bookingList.filters.includeCancelled")}
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["all", "in_attesa", "confermata", "cancellata"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, status: st }))}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                filters.status === st ? "bg-rw-accent text-white" : "border border-rw-line bg-rw-surfaceAlt text-rw-ink"
              }`}
            >
              {st === "all" ? t("hotel.bookingList.filters.allStatus") : statusLabel(st)}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, channel: "all" }))}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              filters.channel === "all" ? "bg-rw-accent/20 text-rw-accent" : "border border-rw-line text-rw-soft"
            }`}
          >
            {t("hotel.bookingList.filters.allChannels")}
          </button>
          {HOTEL_BOOKING_CHANNELS.map((ch) => {
            const Icon = CHANNEL_ICONS[ch];
            return (
              <button
                key={ch}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, channel: ch }))}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  filters.channel === ch ? "bg-rw-accent/20 text-rw-accent" : "border border-rw-line text-rw-soft"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {channelLabel(ch)}
              </button>
            );
          })}
        </div>
      </Card>

      <Card title={t("hotel.bookingList.table.title")} description={tf(t, "hotel.bookingList.table.desc", { n: data?.total ?? 0 })}>
        {loading && !data ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-rw-muted">
            <Loader2 className="h-5 w-5 animate-spin" /> {t("ui.loading")}
          </div>
        ) : (
          <DataTable
            data={data?.items ?? []}
            keyExtractor={(row) => row.id}
            emptyMessage={t("hotel.bookingList.empty")}
            columns={[
              {
                key: "guest",
                header: t("hotel.bookingList.col.guest"),
                render: (row) => (
                  <div>
                    <p className="font-semibold text-rw-ink">{row.guestName}</p>
                    <p className="text-xs text-rw-muted">{row.phone} · {row.email}</p>
                  </div>
                ),
              },
              {
                key: "channel",
                header: t("hotel.bookingList.col.channel"),
                render: (row) => {
                  const ch = row.channel ?? "desk";
                  const Icon = CHANNEL_ICONS[ch];
                  return (
                    <span className="inline-flex items-center gap-1.5 text-sm text-rw-soft">
                      <Icon className="h-3.5 w-3.5" />
                      {channelLabel(ch)}
                      {row.voucherCode ? <span className="font-mono text-xs text-rw-muted">({row.voucherCode})</span> : null}
                    </span>
                  );
                },
              },
              {
                key: "stay",
                header: t("hotel.bookingList.col.stay"),
                render: (row) => (
                  <div>
                    <p className="text-rw-ink">{row.checkInDate} → {row.checkOutDate}</p>
                    <p className="text-xs text-rw-muted">{row.nights} {t("hotel.booking.nights")} · {row.roomType}</p>
                  </div>
                ),
              },
              {
                key: "rate",
                header: t("hotel.bookingList.col.rate"),
                render: (row) => (
                  <span className="font-semibold text-rw-ink">
                    {formatCurrency(row.rate)}/n
                    <span className="block text-xs font-normal text-rw-muted">
                      {formatCurrency(stayTotalFromNightly(row.rate, row.nights))}
                    </span>
                  </span>
                ),
              },
              {
                key: "status",
                header: t("hotel.bookingList.col.status"),
                render: (row) => (
                  <Chip label={statusLabel(row.status)} tone={STATUS_TONE[row.status as keyof typeof STATUS_TONE] ?? "default"} />
                ),
              },
              {
                key: "actions",
                header: "",
                render: (row) => (
                  <div className="flex flex-wrap gap-1.5">
                    {canConfirm(row.status) && (
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-400"
                        onClick={() => void patchStatus(row.id, "confermata")}
                      >
                        <CheckCircle2 className="mr-1 inline h-3 w-3" />
                        {t("hotel.bookingList.action.confirm")}
                      </button>
                    )}
                    {canCheckIn(row.status) && (
                      <Link
                        href={`/hotel/front-desk?reservation=${row.id}`}
                        className="rounded-lg border border-rw-accent/40 bg-rw-accent/10 px-2 py-1 text-xs font-semibold text-rw-accent"
                      >
                        {t("hotel.bookingList.action.checkIn")}
                      </Link>
                    )}
                    <button
                      type="button"
                      disabled={busy || row.status === "cancellata"}
                      className={BTN_OUTLINE}
                      onClick={() => openEdit(row)}
                    >
                      {t("ui.edit")}
                    </button>
                    {canCancel(row.status) && (
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-400"
                        onClick={() => void patchStatus(row.id, "cancellata")}
                      >
                        <XCircle className="mr-1 inline h-3 w-3" />
                        {t("hotel.bookingList.action.cancel")}
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Card title={t("hotel.bookingList.flow.title")}>
        <p className="text-sm text-rw-soft">{t("hotel.bookingList.flow.desc")}</p>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? t("hotel.bookingList.form.edit") : t("hotel.bookingList.form.new")}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={`${INPUT_CLASS} sm:col-span-2`} placeholder={t("hotel.booking.form.guest_name")} value={form.guestName} onChange={(e) => setForm((p) => ({ ...p, guestName: e.target.value }))} />
          <input className={INPUT_CLASS} placeholder={t("ui.phone")} value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          <input className={INPUT_CLASS} placeholder={t("ui.email")} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <select className={SELECT_CLASS} value={form.channel ?? "desk"} onChange={(e) => {
            const channel = e.target.value as HotelBookingChannel;
            setForm((p) => ({ ...p, channel, status: editingId ? p.status : defaultStatusForChannel(channel) }));
          }}>
            {HOTEL_BOOKING_CHANNELS.map((ch) => (
              <option key={ch} value={ch}>{channelLabel(ch)}</option>
            ))}
          </select>
          <select className={SELECT_CLASS} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as HotelReservationStatus }))}>
            <option value="in_attesa">{statusLabel("in_attesa")}</option>
            <option value="confermata">{statusLabel("confermata")}</option>
            <option value="cancellata">{statusLabel("cancellata")}</option>
          </select>
          {form.channel === "voucher" && (
            <input className={`${INPUT_CLASS} sm:col-span-2`} placeholder={t("hotel.bookingList.form.voucherCode")} value={form.voucherCode ?? ""} onChange={(e) => setForm((p) => ({ ...p, voucherCode: e.target.value }))} />
          )}
          <input type="date" className={INPUT_CLASS} value={form.checkInDate} onChange={(e) => setForm((p) => ({ ...p, checkInDate: e.target.value, nights: nightsBetweenIso(e.target.value, p.checkOutDate) }))} />
          <input type="date" className={INPUT_CLASS} value={form.checkOutDate} onChange={(e) => setForm((p) => ({ ...p, checkOutDate: e.target.value, nights: nightsBetweenIso(p.checkInDate, e.target.value) }))} />
          <div className="sm:col-span-2">
            <HotelRoomTypeSelect id="bl-room-type" value={form.roomType} onChange={(roomType) => setForm((p) => ({ ...p, roomType }))} selectClassName="w-full" />
          </div>
          <select className={SELECT_CLASS} value={form.boardType} onChange={(e) => setForm((p) => ({ ...p, boardType: e.target.value as typeof form.boardType }))}>
            <option value="room_only">Room only</option>
            <option value="bed_breakfast">B&B</option>
            <option value="half_board">{t("hotel.booking.board.half")}</option>
            <option value="full_board">{t("hotel.booking.board.full")}</option>
          </select>
          <input type="number" min="0" step="0.01" className={INPUT_CLASS} placeholder={t("hotel.booking.form.nightly_label")} value={form.rate} onChange={(e) => setForm((p) => ({ ...p, rate: parseFloat(e.target.value) || 0 }))} />
          {availability && availability.ratePlans.length > 0 && (
            <select
              className={`${SELECT_CLASS} sm:col-span-2`}
              value={form.ratePlanName ?? ""}
              onChange={(e) => {
                const plan = availability.ratePlans.find((p) => p.name === e.target.value);
                if (plan) setForm((p) => ({ ...p, rate: plan.nightlyRate, boardType: plan.boardType, ratePlanName: plan.name }));
              }}
            >
              <option value="">{t("hotel.booking.form.rate_plan_none")}</option>
              {availability.ratePlans.map((plan) => (
                <option key={plan.id} value={plan.name}>{plan.name} — {formatCurrency(plan.nightlyRate)}/n</option>
              ))}
            </select>
          )}
          <input className={`${INPUT_CLASS} sm:col-span-2`} placeholder={t("hotel.booking.form.document")} value={form.documentCode} onChange={(e) => setForm((p) => ({ ...p, documentCode: e.target.value }))} />
          <textarea className={`${INPUT_CLASS} sm:col-span-2`} rows={2} placeholder={t("hotel.bookingList.form.notes")} value={form.receptionNotes ?? ""} onChange={(e) => setForm((p) => ({ ...p, receptionNotes: e.target.value }))} />
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" className={BTN_PRIMARY} disabled={busy} onClick={() => void saveForm()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? t("hotel.booking.form.save") : t("hotel.booking.form.create")}
            </button>
            <button type="button" className={BTN_GHOST} onClick={() => setModalOpen(false)}>{t("ui.cancel")}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
