"use client";

import type { Customer, HotelReservation, RatePlan } from "@/lib/api-client";
import { folioBoardKey, folioStayStatusKey, ratePlanLabel } from "@/lib/hotel/folio-utils";
import { cn } from "@/lib/utils";
import { Card } from "@/components/shared/card";
import { PANEL_GRID_2 } from "@/components/shared/ui-classes";
import { tf } from "@/core/i18n/interpolate";
import { useI18n } from "@/core/i18n/provider";
import { useI10n } from "@/core/i18n/formatters";

type Props = {
  customer: Customer | null;
  reservation: HotelReservation | null;
  ratePlans: RatePlan[];
};

export function FolioGuestReservationPanels({ customer, reservation, ratePlans }: Props) {
  const { t } = useI18n();
  const { formatCurrency } = useI10n();
  const yes = t("hotel.folio.guestPanel.yes");
  const no = t("hotel.folio.guestPanel.no");

  return (
    <div className={PANEL_GRID_2}>
      <Card className="min-w-0" title={t("hotel.folio.guestPanel.guest.title")}>
        <dl className="grid gap-2 text-sm">
          <Row label={t("hotel.folio.guestPanel.fullName")} value={customer?.name || reservation?.guestName || "—"} />
          <Row label={t("hotel.folio.guestPanel.document")} value={reservation?.documentCode || "—"} />
          <Row label={t("hotel.folio.guestPanel.phone")} value={customer?.phone || reservation?.phone || "—"} />
          <Row label={t("hotel.folio.guestPanel.email")} value={customer?.email || reservation?.email || "—"} />
          <Row label={t("hotel.folio.guestPanel.vip")} value={customer?.type === "vip" ? yes : no} highlight={customer?.type === "vip"} />
          <Row
            label={t("hotel.folio.guestPanel.loyalty")}
            value={
              customer
                ? tf(t, "hotel.folio.guestPanel.loyaltyValue", {
                    visits: customer.visits,
                    amount: formatCurrency(customer.totalSpent),
                  })
                : "—"
            }
          />
          <Row label={t("hotel.folio.guestPanel.receptionNotes")} value={reservation?.receptionNotes || customer?.notes || customer?.preferences || "—"} />
          <Row label={t("hotel.folio.guestPanel.allergies")} value={customer?.allergies || "—"} />
        </dl>
      </Card>
      <Card className="min-w-0" title={t("hotel.folio.guestPanel.reservation.title")}>
        {reservation ? (
          <dl className="grid gap-2 text-sm">
            <Row label={t("hotel.folio.guestPanel.bookingNo")} value={reservation.id} mono />
            <Row label={t("hotel.folio.guestPanel.nationality")} value={reservation.nationality || "—"} />
            <Row label={t("hotel.folio.guestPanel.address")} value={reservation.address || "—"} />
            <Row label={t("hotel.folio.guestPanel.company")} value={reservation.company || "—"} />
            <Row label={t("hotel.folio.guestPanel.channel")} value={reservation.channel || t("hotel.folio.guestPanel.channelDirect")} />
            <Row
              label={t("hotel.folio.guestPanel.rate")}
              value={tf(t, "hotel.folio.guestPanel.ratePerNight", { amount: formatCurrency(reservation.rate) })}
            />
            <Row label={t("hotel.folio.guestPanel.ratePlan")} value={reservation.ratePlanName || ratePlanLabel(reservation, ratePlans)} />
            <Row label={t("hotel.folio.guestPanel.package")} value={reservation.packageName || "—"} />
            <Row label={t("hotel.folio.guestPanel.board")} value={t(folioBoardKey(reservation.boardType))} />
            <Row label={t("hotel.folio.guestPanel.adults")} value={String(reservation.guests)} />
            <Row label={t("hotel.folio.guestPanel.children")} value={String(reservation.children ?? 0)} />
            <Row label={t("hotel.folio.guestPanel.crib")} value={reservation.crib ? yes : no} />
            <Row label={t("hotel.folio.guestPanel.nights")} value={String(reservation.nights)} />
            <Row label={t("hotel.folio.guestPanel.earlyCheckin")} value={reservation.earlyCheckin ? yes : no} />
            <Row label={t("hotel.folio.guestPanel.lateCheckout")} value={reservation.lateCheckout ? yes : no} />
            <Row
              label={t("hotel.folio.guestPanel.deposit")}
              value={reservation.depositReceived != null ? formatCurrency(reservation.depositReceived) : "—"}
            />
            <Row label={t("hotel.folio.guestPanel.receptionNotes")} value={reservation.receptionNotes || "—"} />
            <Row label={t("hotel.folio.guestPanel.roomType")} value={reservation.roomType} />
            <Row label={t("hotel.folio.guestPanel.status")} value={t(folioStayStatusKey(reservation.status))} />
          </dl>
        ) : (
          <p className="text-sm text-rw-muted">{t("hotel.folio.guestPanel.reservation.empty")}</p>
        )}
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex min-w-0 justify-between gap-3 border-b border-rw-line/40 py-1.5">
      <dt className="shrink-0 text-rw-muted">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-right [overflow-wrap:anywhere]",
          mono ? "font-mono text-xs text-rw-ink" : highlight ? "font-semibold text-amber-400" : "text-rw-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
