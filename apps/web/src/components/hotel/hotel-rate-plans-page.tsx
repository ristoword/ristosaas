"use client";

import { useState } from "react";
import { Plus, Tags } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import { HotelRoomTypeSelect } from "@/components/hotel/hotel-room-type-select";
import { useHotel } from "@/components/hotel/hotel-context";
import type { RatePlan } from "@/lib/api-client";
import { useI18n } from "@/core/i18n/provider";

const boardOptions = [
  { value: "room_only", label: "Room only" },
  { value: "bed_breakfast", label: "B&B" },
  { value: "half_board", label: "Half board" },
  { value: "full_board", label: "Full board" },
] as const;

function emptyPlan(): Omit<RatePlan, "id"> & { code: string; name: string } {
  return {
    code: "",
    name: "",
    roomType: "CLASSIC",
    boardType: "bed_breakfast",
    nightlyRate: 0,
    refundable: true,
    active: true,
    priceIncludesVat: true,
  };
}

export function HotelRatePlansPage() {
  const { ratePlans, createRatePlan, updateRatePlan, deleteRatePlan } = useHotel();
  const { t } = useI18n();
  const [form, setForm] = useState(emptyPlan);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader title={t("hotel.ratePlans.title")} subtitle={t("hotel.ratePlans.subtitle")}>
        <Tags className="h-5 w-5 text-rw-accent" />
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card title={editingId ? t("hotel.ratePlans.form.edit") : t("hotel.ratePlans.form.new")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink"
              placeholder={t("hotel.ratePlans.form.code")}
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
            />
            <input
              className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink sm:col-span-2"
              placeholder={t("hotel.ratePlans.form.name")}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            <div className="sm:col-span-2">
              <HotelRoomTypeSelect
                id="rate-plan-room-type"
                value={form.roomType}
                onChange={(roomType) => setForm((p) => ({ ...p, roomType }))}
                selectClassName="w-full"
              />
            </div>
            <select
              className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink"
              value={form.boardType}
              onChange={(e) => setForm((p) => ({ ...p, boardType: e.target.value as RatePlan["boardType"] }))}
            >
              {boardOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <div>
              <label className="text-xs font-semibold text-rw-muted">{t("hotel.ratePlans.form.nightly")}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink"
                value={form.nightlyRate || ""}
                onChange={(e) => setForm((p) => ({ ...p, nightlyRate: parseFloat(e.target.value) || 0 }))}
              />
              <p className="mt-1 text-[11px] text-rw-muted">{t("hotel.booking.form.vat_included")}</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-rw-soft sm:col-span-2">
              <input type="checkbox" checked={form.refundable} onChange={(e) => setForm((p) => ({ ...p, refundable: e.target.checked }))} />
              {t("hotel.ratePlans.form.refundable")}
            </label>
            <label className="flex items-center gap-2 text-sm text-rw-soft sm:col-span-2">
              <input type="checkbox" checked={form.active !== false} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} />
              {t("hotel.ratePlans.form.active")}
            </label>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white sm:col-span-2"
              onClick={() => {
                const action = editingId ? updateRatePlan(editingId, form) : createRatePlan(form);
                action
                  .then(() => {
                    setEditingId(null);
                    setForm(emptyPlan());
                  })
                  .catch(console.error);
              }}
            >
              <Plus className="h-4 w-4" />
              {editingId ? t("ui.save") : t("ui.create")}
            </button>
          </div>
        </Card>

        <Card title={t("hotel.ratePlans.list.title")} description={t("hotel.ratePlans.list.desc")}>
          <DataTable
            columns={[
              { key: "code", header: t("hotel.ratePlans.col.code"), render: (r) => <span className="font-mono text-xs">{r.code}</span> },
              { key: "name", header: t("hotel.ratePlans.col.name"), render: (r) => r.name },
              { key: "roomType", header: t("hotel.ratePlans.col.roomType"), render: (r) => r.roomType },
              { key: "boardType", header: t("hotel.ratePlans.col.board"), render: (r) => r.boardType },
              {
                key: "nightlyRate",
                header: t("hotel.ratePlans.col.rate"),
                render: (r) => (
                  <span>
                    € {r.nightlyRate.toFixed(2)}/n
                    <span className="block text-[10px] text-rw-muted">{t("hotel.booking.form.vat_included")}</span>
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
                      className="rounded-lg border border-rw-line px-2 py-1 text-xs font-semibold"
                      onClick={() => {
                        setEditingId(row.id);
                        setForm({
                          code: row.code,
                          name: row.name,
                          roomType: row.roomType,
                          boardType: row.boardType,
                          nightlyRate: row.nightlyRate,
                          refundable: row.refundable,
                          active: row.active !== false,
                          priceIncludesVat: row.priceIncludesVat !== false,
                        });
                      }}
                    >
                      {t("ui.edit")}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-400"
                      onClick={() => deleteRatePlan(row.id).catch(console.error)}
                    >
                      {t("ui.delete")}
                    </button>
                  </div>
                ),
              },
            ]}
            data={ratePlans}
            keyExtractor={(r) => r.id}
            emptyMessage={t("hotel.ratePlans.empty")}
          />
        </Card>
      </div>
    </div>
  );
}
