export type GuestFolio = {
  id: string;
  tenantId: string;
  customerId: string;
  stayId: string | null;
  currency: string;
  balance: number;
  status: "open" | "closed";
  locked?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  department?: string | null;
  operator?: string | null;
  quantity?: number;
  unitPrice?: number | null;
  vatPct?: number;
  section?: string | null;
  splitCode?: string;
  lineStatus?: string;
  createdByUserId?: string | null;
  createdByName?: string | null;
};

export type FolioAuditLogEntry = {
  id: string;
  folioId: string;
  chargeId: string | null;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  userName: string | null;
  ip: string | null;
  createdAt: string;
};

export type FolioAttachmentEntry = {
  id: string;
  folioId: string;
  type: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};
