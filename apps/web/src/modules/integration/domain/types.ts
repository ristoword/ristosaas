export type GuestFolio = {
  id: string;
  tenantId: string;
  customerId: string;
  stayId: string | null;
  currency: string;
  balance: number;
  status: "open" | "closed";
  guestName?: string | null;
  roomCode?: string | null;
  reservationId?: string | null;
};

export type FolioChargeSource = "hotel" | "restaurant" | "manual" | "city_tax" | "payment" | "meal_plan_credit" | "room_service";

export type FolioCharge = {
  id: string;
  folioId: string;
  source: FolioChargeSource;
  sourceId: string | null;
  description: string;
  amount: number;
  postedAt: string;
};
