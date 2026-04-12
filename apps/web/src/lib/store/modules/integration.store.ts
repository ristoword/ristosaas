import { uid } from "@/lib/store/id";
import { hotelStore } from "@/lib/store/modules/hotel.store";
import type { FolioCharge, GuestFolio } from "@/modules/integration/domain/types";

const guestFolios = new Map<string, GuestFolio>();
const folioCharges = new Map<string, FolioCharge>();

function getOrCreateFolioByReservation(reservationId: string) {
  const reservation = hotelStore.reservations.get(reservationId);
  if (!reservation) return null;

  const existing = [...guestFolios.values()].find((folio) => folio.stayId === reservationId || folio.customerId === reservation.customerId);
  if (existing) return existing;

  const folio: GuestFolio = {
    id: uid("folio"),
    tenantId: "tenant_demo",
    customerId: reservation.customerId,
    stayId: reservationId,
    currency: "EUR",
    balance: 0,
    status: "open",
  };
  guestFolios.set(folio.id, folio);
  return folio;
}

export function postRestaurantChargeToRoom(params: {
  reservationId: string;
  orderId: string;
  description: string;
  amount: number;
  serviceType: "breakfast" | "lunch" | "dinner";
}) {
  const folio = getOrCreateFolioByReservation(params.reservationId);
  if (!folio) return null;
  const reservation = hotelStore.reservations.get(params.reservationId);
  if (!reservation) return null;

  const charge: FolioCharge = {
    id: uid("charge"),
    folioId: folio.id,
    source: "restaurant",
    sourceId: params.orderId,
    description: params.description,
    amount: params.amount,
    postedAt: new Date().toISOString(),
  };
  folioCharges.set(charge.id, charge);
  let nextBalance = folio.balance + params.amount;

  const coveredByMealPlan =
    (reservation.boardType === "bed_breakfast" && params.serviceType === "breakfast") ||
    (reservation.boardType === "half_board" && ["breakfast", "dinner"].includes(params.serviceType)) ||
    (reservation.boardType === "full_board" && ["breakfast", "lunch", "dinner"].includes(params.serviceType));

  if (coveredByMealPlan) {
    const credit: FolioCharge = {
      id: uid("charge"),
      folioId: folio.id,
      source: "meal_plan_credit",
      sourceId: params.reservationId,
      description: `Copertura piano pasti (${params.serviceType})`,
      amount: -params.amount,
      postedAt: new Date().toISOString(),
    };
    folioCharges.set(credit.id, credit);
    nextBalance -= params.amount;
  }

  guestFolios.set(folio.id, { ...folio, balance: nextBalance });

  return {
    folio: guestFolios.get(folio.id)!,
    charge,
    credits: integrationStore.folioCharges.byFolioId(folio.id).filter((item) => item.source === "meal_plan_credit"),
  };
}

export function closeGuestFolioForCheckout(params: {
  reservationId: string;
  cityTaxAmount: number;
  paymentMethod: "cash" | "card" | "room_charge_settlement";
}) {
  const folio = getOrCreateFolioByReservation(params.reservationId);
  if (!folio) return null;

  let currentFolio = folio;

  if (params.cityTaxAmount > 0) {
    const cityTax: FolioCharge = {
      id: uid("charge"),
      folioId: folio.id,
      source: "city_tax",
      sourceId: params.reservationId,
      description: "Tassa di soggiorno",
      amount: params.cityTaxAmount,
      postedAt: new Date().toISOString(),
    };
    folioCharges.set(cityTax.id, cityTax);
    currentFolio = { ...currentFolio, balance: currentFolio.balance + params.cityTaxAmount };
    guestFolios.set(currentFolio.id, currentFolio);
  }

  const payment: FolioCharge = {
    id: uid("charge"),
    folioId: currentFolio.id,
    source: "payment",
    sourceId: params.reservationId,
    description: `Saldo finale soggiorno (${params.paymentMethod})`,
    amount: -currentFolio.balance,
    postedAt: new Date().toISOString(),
  };
  folioCharges.set(payment.id, payment);

  const closedFolio = { ...currentFolio, balance: 0, status: "closed" as const };
  guestFolios.set(closedFolio.id, closedFolio);

  return {
    folio: closedFolio,
    charges: integrationStore.folioCharges.byFolioId(closedFolio.id),
    settlement: payment,
  };
}

export const integrationStore = {
  guestFolios: {
    all: () => [...guestFolios.values()],
    get: (id: string) => guestFolios.get(id),
    set: (id: string, folio: GuestFolio) => guestFolios.set(id, folio),
    getOrCreateByReservation: getOrCreateFolioByReservation,
  },
  folioCharges: {
    all: () => [...folioCharges.values()],
    get: (id: string) => folioCharges.get(id),
    set: (id: string, charge: FolioCharge) => folioCharges.set(id, charge),
    byFolioId: (folioId: string) => [...folioCharges.values()].filter((charge) => charge.folioId === folioId),
  },
};
