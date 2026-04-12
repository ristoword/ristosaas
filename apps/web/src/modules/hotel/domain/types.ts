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
};

export type RatePlan = {
  id: string;
  code: string;
  name: string;
  roomType: string;
  boardType: HotelReservation["boardType"];
  nightlyRate: number;
  refundable: boolean;
};

export type HotelReservationStatus =
  | "confermata"
  | "in_casa"
  | "check_out"
  | "cancellata"
  | "no_show";

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
