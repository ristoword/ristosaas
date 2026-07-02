"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { HotelRoomTypeSelect } from "@/components/hotel/hotel-room-type-select";
import { useHotel } from "@/components/hotel/hotel-context";
import type { HotelRoom } from "@/lib/api-client";
import { isRoomAvailableForRange } from "@/modules/hotel/domain/availability";
import { todayIso, addDaysIso } from "@/lib/date-utils";
import { useI18n } from "@/core/i18n/provider";

const roomTone = {
  libera: "success",
  occupata: "danger",
  da_pulire: "warn",
  pulita: "info",
  fuori_servizio: "default",
  manutenzione: "default",
} as const;

export function HotelRoomsPage() {
  const { rooms, reservations, stays, housekeeping, ratePlans, createRoom, updateRoom, deleteRoom, failedSlices } = useHotel();
  const { t } = useI18n();
  const [calendarStart, setCalendarStart] = useState(() => todayIso());
  const [calendarEnd, setCalendarEnd] = useState(() => addDaysIso(todayIso(), 1));
  const [form, setForm] = useState<Omit<HotelRoom, "id">>({
    code: "",
    floor: 1,
    capacity: 2,
    roomType: "CLASSIC",
    status: "libera",
    defaultNightlyRate: 0,
  });
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  const availableToday = rooms.filter((room) =>
    isRoomAvailableForRange(room, reservations, stays, calendarStart, calendarEnd),
  ).length;

  const calendarRows = useMemo(
    () =>
      rooms.map((room) => ({
        ...room,
        available: isRoomAvailableForRange(room, reservations, stays, calendarStart, calendarEnd),
      })),
    [rooms, reservations, stays, calendarStart, calendarEnd],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("hotel.room.title")} subtitle={t("hotel.room.subtitle")}>
        <Chip label={t("hotel.room.chip.available")} value={availableToday} tone="success" />
        <Chip label={t("hotel.room.chip.total")} value={rooms.length} tone="accent" />
      </PageHeader>

      {failedSlices.length > 0 ? (
        <p
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
        >
          {t("hotel.room.alert.partial")} {failedSlices.join(", ")}{t("hotel.room.alert.partial2")}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card title={t("hotel.room.form.title")} description={t("hotel.room.form.desc")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" placeholder={t("hotel.room.form.number")} value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} />
            <input type="number" min="0" className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" placeholder={t("hotel.room.form.floor")} value={form.floor} onChange={(e) => setForm((prev) => ({ ...prev, floor: parseInt(e.target.value, 10) || 0 }))} />
            <input type="number" min="1" className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" placeholder={t("hotel.room.form.capacity")} value={form.capacity} onChange={(e) => setForm((prev) => ({ ...prev, capacity: parseInt(e.target.value, 10) || 1 }))} />
            <div>
              <label className="text-xs font-semibold text-rw-muted" htmlFor="hotel-room-nightly">
                {t("hotel.room.form.nightly_label")}
              </label>
              <input
                id="hotel-room-nightly"
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink"
                placeholder="0.00"
                value={form.defaultNightlyRate || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, defaultNightlyRate: parseFloat(e.target.value) || 0 }))
                }
              />
              <p className="mt-1 text-[11px] text-rw-muted">{t("hotel.room.form.nightly_hint")} · {t("hotel.booking.form.vat_included")}</p>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-rw-muted" htmlFor="hotel-room-rate-plan">
                {t("hotel.room.form.rate_plan")}
              </label>
              <select
                id="hotel-room-rate-plan"
                className="mt-1 w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink"
                value={form.ratePlanCode ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, ratePlanCode: e.target.value || undefined }))}
              >
                <option value="">{t("hotel.room.form.rate_plan_none")}</option>
                {ratePlans
                  .filter((p) => p.active !== false && (p.roomType === form.roomType || !form.roomType))
                  .map((p) => (
                    <option key={p.id} value={p.code}>
                      {p.name} (€ {p.nightlyRate.toFixed(2)}/n)
                    </option>
                  ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <HotelRoomTypeSelect
                id="hotel-room-type"
                value={form.roomType}
                onChange={(roomType) => setForm((prev) => ({ ...prev, roomType }))}
                selectClassName="w-full"
              />
            </div>
            <select className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink sm:col-span-2" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as typeof form.status }))}>
              <option value="libera">{t("hotel.room.status.libera")}</option>
              <option value="pulita">{t("hotel.room.status.pulita")}</option>
              <option value="da_pulire">{t("hotel.room.status.da_pulire")}</option>
              <option value="occupata">{t("hotel.room.status.occupata")}</option>
              <option value="fuori_servizio">{t("hotel.room.status.fuori_servizio")}</option>
              <option value="manutenzione">{t("hotel.room.status.manutenzione")}</option>
            </select>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white sm:col-span-2"
              onClick={() => {
                const action = editingRoomId ? updateRoom(editingRoomId, form) : createRoom(form);
                action.then(() => {
                  setEditingRoomId(null);
                  setForm({ code: "", floor: 1, capacity: 2, roomType: "CLASSIC", status: "libera", defaultNightlyRate: 0 });
                }).catch(console.error);
              }}
            >
              {editingRoomId ? t("hotel.room.form.save") : t("hotel.room.form.create")}
            </button>
          </div>
        </Card>

        <Card title={t("hotel.room.calendar.title")} description={t("hotel.room.calendar.desc")}>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <input type="date" className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" value={calendarStart} onChange={(e) => setCalendarStart(e.target.value)} />
            <input type="date" className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" value={calendarEnd} onChange={(e) => setCalendarEnd(e.target.value)} />
          </div>
          <DataTable
            columns={[
              { key: "code", header: t("hotel.room.col.room"), render: (row) => <span className="font-semibold text-rw-ink">{row.code}</span> },
              { key: "roomType", header: t("hotel.room.col.type"), render: (row) => <span className="text-rw-soft">{row.roomType}</span> },
              {
                key: "defaultNightlyRate",
                header: t("hotel.room.col.nightly"),
                render: (row) => (
                  <span className="font-medium text-rw-ink">
                    {row.defaultNightlyRate > 0 ? `€ ${row.defaultNightlyRate.toFixed(2)}` : "—"}
                  </span>
                ),
              },
              { key: "status", header: t("hotel.room.col.op_status"), render: (row) => <Chip label={row.status.replace("_", " ")} tone={roomTone[row.status]} /> },
              { key: "available", header: t("hotel.room.col.availability"), render: (row) => <Chip label={row.available ? t("hotel.room.available") : t("hotel.room.unavailable")} tone={row.available ? "success" : "danger"} /> },
            ]}
            data={calendarRows}
            keyExtractor={(row) => row.id}
          />
        </Card>
      </div>

      <Card title={t("hotel.room.ops.title")} description={t("hotel.room.ops.desc")}>
        <DataTable
          columns={[
            { key: "code", header: t("hotel.room.col.room"), render: (row) => <span className="font-semibold text-rw-ink">{row.code}</span> },
            {
              key: "defaultNightlyRate",
              header: t("hotel.room.col.rate"),
              render: (row) => (
                <span className="text-rw-soft">{row.defaultNightlyRate > 0 ? `€${row.defaultNightlyRate.toFixed(2)}/n` : "—"}</span>
              ),
            },
            { key: "status", header: t("hotel.room.col.status"), render: (row) => <Chip label={row.status.replace("_", " ")} tone={roomTone[row.status]} /> },
            {
              key: "guest",
              header: t("hotel.room.col.guest"),
              render: (row) => {
                const reservation = reservations.find((item) => item.roomId === row.id && item.status === "in_casa");
                return <span className="text-rw-ink">{reservation?.guestName || "-"}</span>;
              },
            },
            {
              key: "arrival",
              header: t("hotel.room.col.arrival"),
              render: (row) => {
                const reservation = reservations.find((item) => item.roomId === row.id && item.status === "in_casa");
                return <span className="text-rw-soft">{reservation?.checkInDate || "-"}</span>;
              },
            },
            {
              key: "departure",
              header: t("hotel.room.col.departure"),
              render: (row) => {
                const reservation = reservations.find((item) => item.roomId === row.id && item.status === "in_casa");
                return <span className="text-rw-soft">{reservation?.checkOutDate || "-"}</span>;
              },
            },
            {
              key: "cleaning",
              header: t("hotel.room.col.cleaning"),
              render: (row) => {
                const task = housekeeping.find((item) => item.roomId === row.id);
                return <span className="text-rw-soft">{task ? `${task.status}${task.inspected ? t("hotel.room.cleaning.inspected") : ""}` : t("hotel.room.cleaning.ready")}</span>;
              },
            },
            {
              key: "availability",
              header: t("hotel.room.col.availability"),
              render: (row) => (
                <span className="text-rw-soft">
                  {isRoomAvailableForRange(row, reservations, stays, calendarStart, calendarEnd) ? t("hotel.room.status.available") : t("hotel.room.status.unavailable")}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (row) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-rw-line bg-rw-surfaceAlt px-2 py-1 text-xs font-semibold text-rw-ink"
                    onClick={() => {
                      setEditingRoomId(row.id);
                      setForm({
                        code: row.code,
                        floor: row.floor,
                        capacity: row.capacity,
                        roomType: row.roomType,
                        status: row.status,
                        defaultNightlyRate: row.defaultNightlyRate ?? 0,
                        ratePlanCode: row.ratePlanCode,
                      });
                    }}
                  >
                    {t("ui.edit")}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-400"
                    onClick={() => deleteRoom(row.id).catch(console.error)}
                  >
                    {t("ui.delete")}
                  </button>
                </div>
              ),
            },
          ]}
          data={rooms}
          keyExtractor={(row) => row.id}
          emptyMessage={t("hotel.room.empty")}
        />
      </Card>
    </div>
  );
}
