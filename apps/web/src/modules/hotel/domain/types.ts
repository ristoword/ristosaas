export type HotelRoomStatus =
  | "libera"
  | "occupata"
  | "da_pulire"
  | "pulita"
  | "fuori_servizio"
  | "manutenzione";

export type HotelRoom = {
  id: string;
  code: string;
  floor: number;
  capacity: number;
  status: HotelRoomStatus;
  roomType: string;
  ratePlanCode?: string;
  /** Listino €/notte per questa camera (prenotazioni / messaggio al cliente). */
  defaultNightlyRate: number;
};

export type RatePlan = {
  id: string;
  code: string;
  name: string;
  roomType: string;
  boardType: HotelReservation["boardType"];
  nightlyRate: number;
  refundable: boolean;
  /** Prezzo lordo IVA inclusa (default true). */
  priceIncludesVat?: boolean;
};

export type HotelReservationStatus =
  | "in_attesa"
  | "confermata"
  | "in_casa"
  | "check_out"
  | "cancellata"
  | "no_show";

export type HotelBookingChannel = "online" | "desk" | "agency" | "voucher";

export type HotelReservation = {
  id: string;
  customerId: string;
  guestName: string;
  phone: string;
  email: string;
  roomId: string | null;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  status: HotelReservationStatus;
  roomType: string;
  boardType: "room_only" | "bed_breakfast" | "half_board" | "full_board";
  nights: number;
  rate: number;
  documentCode: string;
  nationality?: string;
  address?: string;
  company?: string;
  channel?: HotelBookingChannel;
  voucherCode?: string | null;
  children?: number;
  crib?: boolean;
  lateCheckout?: boolean;
  earlyCheckin?: boolean;
  depositReceived?: number | null;
  receptionNotes?: string;
  packageName?: string;
  ratePlanName?: string;
};

export type HotelStay = {
  id: string;
  reservationId: string;
  roomId: string;
  actualCheckInAt: string | null;
  actualCheckOutAt: string | null;
};

export type HousekeepingTask = {
  id: string;
  roomId: string;
  assignedTo: string;
  status: "todo" | "in_progress" | "done";
  scheduledFor: string;
  inspected: boolean;
};

export type KeycardStatus = "attiva" | "scaduta" | "annullata";

export type HotelKeycard = {
  id: string;
  roomId: string;
  reservationId: string;
  validFrom: string;
  validUntil: string;
  status: KeycardStatus;
  issuedBy: string;
};
