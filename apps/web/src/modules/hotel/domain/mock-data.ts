import type { HousekeepingTask, HotelKeycard, HotelReservation, HotelRoom, HotelStay } from "@/modules/hotel/domain/types";

export const hotelRooms: HotelRoom[] = [
  { id: "hr_101", code: "101", floor: 1, capacity: 2, status: "occupata", roomType: "Classic" },
  { id: "hr_102", code: "102", floor: 1, capacity: 2, status: "pulita", roomType: "Classic" },
  { id: "hr_103", code: "103", floor: 1, capacity: 3, status: "da_pulire", roomType: "Deluxe" },
  { id: "hr_104", code: "104", floor: 1, capacity: 4, status: "libera", roomType: "Family" },
  { id: "hr_201", code: "201", floor: 2, capacity: 2, status: "manutenzione", roomType: "Superior" },
  { id: "hr_202", code: "202", floor: 2, capacity: 2, status: "fuori_servizio", roomType: "Classic" },
  { id: "hr_203", code: "203", floor: 2, capacity: 2, status: "pulita", roomType: "Superior" },
  { id: "hr_204", code: "204", floor: 2, capacity: 3, status: "libera", roomType: "Deluxe" },
];

export const hotelReservations: HotelReservation[] = [
  {
    id: "res_1",
    customerId: "cst_1",
    guestName: "Giovanni Rossi",
    phone: "+39 333 1111111",
    email: "g.rossi@email.it",
    roomId: "hr_101",
    checkInDate: "2026-04-12",
    checkOutDate: "2026-04-14",
    guests: 2,
    status: "in_casa",
    roomType: "Classic",
    boardType: "bed_breakfast",
    nights: 2,
    rate: 180,
    documentCode: "CI123456",
  },
  {
    id: "res_2",
    customerId: "cst_2",
    guestName: "Anna Bianchi",
    phone: "+39 333 2222222",
    email: "anna@email.it",
    roomId: "hr_103",
    checkInDate: "2026-04-11",
    checkOutDate: "2026-04-12",
    guests: 1,
    status: "check_out",
    roomType: "Deluxe",
    boardType: "room_only",
    nights: 1,
    rate: 120,
    documentCode: "AZ334455",
  },
  {
    id: "res_3",
    customerId: "cst_3",
    guestName: "Laura Moretti",
    phone: "+39 333 3333333",
    email: "laura@email.it",
    roomId: null,
    checkInDate: "2026-04-13",
    checkOutDate: "2026-04-16",
    guests: 2,
    status: "confermata",
    roomType: "Superior",
    boardType: "half_board",
    nights: 3,
    rate: 390,
    documentCode: "LM998877",
  },
  {
    id: "res_4",
    customerId: "cst_4",
    guestName: "Marco De Luca",
    phone: "+39 333 4444444",
    email: "marco@email.it",
    roomId: "hr_204",
    checkInDate: "2026-04-12",
    checkOutDate: "2026-04-15",
    guests: 3,
    status: "confermata",
    roomType: "Deluxe",
    boardType: "full_board",
    nights: 3,
    rate: 450,
    documentCode: "MD556677",
  },
];

export const hotelStays: HotelStay[] = [
  {
    id: "stay_1",
    reservationId: "res_1",
    roomId: "hr_101",
    actualCheckInAt: "2026-04-12T14:10:00Z",
    actualCheckOutAt: null,
  },
];

export const housekeepingTasks: HousekeepingTask[] = [
  { id: "hk_1", roomId: "hr_103", assignedTo: "Sofia", status: "in_progress", scheduledFor: "2026-04-12", inspected: false },
  { id: "hk_2", roomId: "hr_102", assignedTo: "Elisa", status: "done", scheduledFor: "2026-04-12", inspected: true },
  { id: "hk_3", roomId: "hr_201", assignedTo: "Tecnico", status: "todo", scheduledFor: "2026-04-12", inspected: false },
];

export const hotelKeycards: HotelKeycard[] = [
  {
    id: "card_1",
    roomId: "hr_101",
    reservationId: "res_1",
    validFrom: "2026-04-12T14:10:00Z",
    validUntil: "2026-04-14T11:00:00Z",
    status: "attiva",
    issuedBy: "reception",
  },
];
