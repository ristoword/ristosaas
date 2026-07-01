"use client";

import { useMemo, useState } from "react";
import {
  CreditCard,
  Percent,
  Printer,
  Save,
  Clock,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
import { useHotel } from "@/components/hotel/hotel-context";
import { useTenantFeatures } from "@/components/auth/auth-context";
import type { Order, OrderItem } from "@/lib/api-client";
import { PayOnlineButton } from "./pay-online-button";
import { CARD_BASE, INPUT_POS, LABEL_POS, TOUCH_BTN_SM } from "./styles";
import { CassaBillEmptyState } from "./table-grid";

type Props = {
  selected: Order | null;
  allItems: OrderItem[];
  subtotal: number;
  discount: string;
  setDiscount: (v: string) => void;
  vatOverride: string;
  setVatOverride: (v: string) => void;
  discountVal: number;
  vatVal: number;
  afterDiscount: number;
  total: number;
  flash: string | null;
  onCloseTable: () => void;
  onFlash: (msg: string) => void;
};

export function CassaBillDetail({
  selected,
  allItems,
  subtotal,
  discount,
  setDiscount,
  vatOverride,
  setVatOverride,
  discountVal,
  vatVal,
  afterDiscount,
  total,
  flash,
  onCloseTable,
  onFlash,
}: Props) {
  const { t } = useI18n();
  const [reservationId, setReservationId] = useState("");
  const [serviceType, setServiceType] = useState<"breakfast" | "lunch" | "dinner">("dinner");
  const { reservations, roomCharge } = useHotel();
  const { isRestaurantEnabled, isHotelEnabled, isRoomChargeEnabled } = useTenantFeatures();
  const roomChargeEnabled = isRestaurantEnabled && isHotelEnabled && isRoomChargeEnabled;

  const inHouseReservations = useMemo(
    () => reservations.filter((r) => r.status === "in_casa"),
    [reservations],
  );

  async function handleRoomCharge() {
    if (!selected || !reservationId) return;
    const tableLabel = selected.table ? `tavolo ${selected.table}` : "asporto";
    const charge = await roomCharge(
      reservationId,
      selected.id,
      `Addebito ristorante ${tableLabel}`,
      Number(total.toFixed(2)),
      serviceType,
    );
    onFlash(`Addebito inviato al folio camera: € ${charge.amount.toFixed(2)}`);
  }

  const tableLabel = selected?.table ?? "";

  return (
    <section className={cn(CARD_BASE, "flex h-full min-h-0 flex-col p-4")}>
      <header className="mb-3 shrink-0 border-b border-rw-line/50 pb-3">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-rw-ink">
          {selected
            ? `${t("ui.bill")} — ${selected.table ? `${t("ui.table")} ${selected.table}` : t("cassa.asporto")}`
            : t("cassa.report.detail")}
        </h2>
        {selected && (
          <p className="text-sm text-rw-muted">
            {t("cassa.col.waiter")}: {selected.waiter} · {t("cassa.col.covers")}: {selected.covers ?? "–"}
          </p>
        )}
      </header>

      {flash && (
        <p
          className="mb-3 shrink-0 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-3 text-sm text-rw-ink"
          role="status"
        >
          {flash}
        </p>
      )}

      {!selected ? (
        <CassaBillEmptyState />
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-xl border border-rw-line/60">
            <table className="w-full min-w-[28rem] text-base">
              <thead className="sticky top-0 z-10 bg-rw-surfaceAlt">
                <tr className="border-b border-rw-line">
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase text-rw-muted">
                    {t("cassa.col.dish")}
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold uppercase text-rw-muted">
                    {t("cassa.col.qty")}
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-bold uppercase text-rw-muted">
                    {t("cassa.col.price")}
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-bold uppercase text-rw-muted">
                    {t("ui.total")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {allItems.map((item) => (
                  <tr key={item.id} className="border-b border-rw-line/30 hover:bg-rw-surfaceAlt/50">
                    <td className="px-3 py-3 text-rw-ink">
                      <div>{item.name}</div>
                      {item.note && <div className="text-xs text-rw-muted italic">{item.note}</div>}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-rw-soft">{item.qty}</td>
                    <td className="px-3 py-3 text-right text-rw-soft">€ {(item.price ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-rw-ink">
                      € {((item.price ?? 0) * item.qty).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 grid shrink-0 gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL_POS}>{t("cassa.discount")}</label>
              <div className="relative">
                <Percent className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-rw-muted" />
                <input
                  type="number"
                  min="0"
                  step="0.50"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0.00"
                  className={cn(INPUT_POS, "pl-10")}
                />
              </div>
            </div>
            <div>
              <label className={LABEL_POS}>{t("cassa.vat")}</label>
              <input
                type="number"
                min="0"
                max="100"
                value={vatOverride}
                onChange={(e) => setVatOverride(e.target.value)}
                placeholder="10"
                className={INPUT_POS}
              />
            </div>
          </div>

          <div className="mt-3 shrink-0 space-y-1.5 rounded-xl border border-rw-line/60 bg-rw-surfaceAlt/80 px-4 py-3 text-base">
            <div className="flex justify-between text-rw-soft">
              <span>{t("cassa.subtotal")}</span>
              <span>€ {subtotal.toFixed(2)}</span>
            </div>
            {discountVal > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>{t("ui.discount")}</span>
                <span>− € {discountVal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-rw-soft">
              <span>
                {t("cassa.vat")} ({vatVal}%)
              </span>
              <span>€ {(afterDiscount * (vatVal / 100)).toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-3 shrink-0 rounded-2xl border-2 border-[#D4AF37]/40 bg-gradient-to-r from-[#D4AF37]/15 to-transparent px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-lg font-bold uppercase text-rw-muted sm:text-xl">{t("ui.total")}</span>
              <span className="font-display text-3xl font-bold tabular-nums text-[#E8C547] sm:text-4xl">
                € {total.toFixed(2)}
              </span>
            </div>
          </div>

          {roomChargeEnabled && (
            <div className="mt-3 shrink-0 rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <p className="text-sm font-semibold text-rw-ink">{t("cassa.roomCharge.title")}</p>
              <p className="mb-3 text-xs text-rw-muted">{t("cassa.roomCharge.desc")}</p>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div className="min-w-0 flex-1">
                  <label className={LABEL_POS}>{t("cassa.roomCharge.reservation")}</label>
                  <select
                    className={INPUT_POS}
                    value={reservationId}
                    onChange={(e) => setReservationId(e.target.value)}
                  >
                    <option value="">{t("cassa.roomCharge.selectGuest")}</option>
                    {inHouseReservations.map((reservation) => (
                      <option key={reservation.id} value={reservation.id}>
                        {reservation.guestName} · {t("ui.room")}{" "}
                        {reservation.roomId?.replace("hr_", "") || "n/d"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0 lg:w-44">
                  <label className={LABEL_POS}>{t("cassa.roomCharge.service")}</label>
                  <select
                    className={INPUT_POS}
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value as typeof serviceType)}
                  >
                    <option value="breakfast">{t("cassa.service.breakfast")}</option>
                    <option value="lunch">{t("cassa.service.lunch")}</option>
                    <option value="dinner">{t("cassa.service.dinner")}</option>
                  </select>
                </div>
                <button
                  type="button"
                  className={`${TOUCH_BTN_SM} border border-rw-line bg-rw-surfaceAlt hover:border-[#D4AF37]/40`}
                  disabled={!reservationId}
                  onClick={() => {
                    handleRoomCharge().catch(() => onFlash(t("cassa.roomCharge.error")));
                  }}
                >
                  <CreditCard className="h-5 w-5 text-[#D4AF37]" />
                  <span className="text-xs">{t("cassa.roomCharge.btn")}</span>
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => onFlash(t("cassa.enterprise.cancelBill.flash"))}
              className={`${TOUCH_BTN_SM} border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20`}
            >
              <X className="h-5 w-5" />
              <span className="text-xs uppercase">{t("cassa.enterprise.cancelBill")}</span>
            </button>
            <button
              type="button"
              onClick={() => onFlash(t("cassa.printBill.flash"))}
              className={`${TOUCH_BTN_SM} border border-emerald-500/40 bg-emerald-500/10 text-emerald-400`}
            >
              <Printer className="h-5 w-5" />
              <span className="text-xs uppercase">{t("cassa.printBill")}</span>
            </button>
            <button
              type="button"
              onClick={() => onFlash(t("cassa.enterprise.saveBill.flash"))}
              className={`${TOUCH_BTN_SM} border border-rw-line bg-rw-surfaceAlt text-rw-ink`}
            >
              <Save className="h-5 w-5 text-[#D4AF37]" />
              <span className="text-xs uppercase">{t("cassa.enterprise.saveBill")}</span>
            </button>
            <button
              type="button"
              onClick={() => onFlash(t("cassa.enterprise.holdBill.flash"))}
              className={`${TOUCH_BTN_SM} border border-amber-500/40 bg-amber-500/10 text-amber-300`}
            >
              <Clock className="h-5 w-5" />
              <span className="text-xs uppercase">{t("cassa.enterprise.holdBill")}</span>
            </button>
          </div>

          <div className="mt-2 flex shrink-0 flex-wrap gap-2">
            <PayOnlineButton total={total} tableLabel={tableLabel} />
            <button
              type="button"
              onClick={onCloseTable}
              className={`${TOUCH_BTN_SM} border border-[#D4AF37]/50 bg-[#D4AF37]/20 text-[#E8C547]`}
            >
              <CreditCard className="h-5 w-5" />
              <span className="text-xs">{t("cassa.closeTable")}</span>
            </button>
          </div>

          {/* Room charge + legacy actions visible on xl via sidebar pay flow */}
        </>
      )}
    </section>
  );
}
