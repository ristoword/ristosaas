import { uid } from "@/lib/store/id";
import { hotelKeycards as seedKeycards, hotelReservations as seedReservations, hotelRooms as seedRooms, hotelStays as seedStays, housekeepingTasks as seedHousekeeping } from "@/modules/hotel/domain/mock-data";
import type { HousekeepingTask, HotelKeycard, HotelReservation, HotelRoom, HotelStay } from "@/modules/hotel/domain/types";

const rooms = new Map<string, HotelRoom>(seedRooms.map((room) => [room.id, room]));
const reservations = new Map<string, HotelReservation>(seedReservations.map((reservation) => [reservation.id, reservation]));
const stays = new Map<string, HotelStay>(seedStays.map((stay) => [stay.id, stay]));
const housekeeping = new Map<string, HousekeepingTask>(seedHousekeeping.map((task) => [task.id, task]));
const keycards = new Map<string, HotelKeycard>(seedKeycards.map((card) => [card.id, card]));

function setRoomStatus(roomId: string, status: HotelRoom["status"]) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const updated = { ...room, status };
  rooms.set(roomId, updated);
  return updated;
}

function ensureCheckoutTask(roomId: string) {
  const existing = [...housekeeping.values()].find((task) => task.roomId === roomId && task.status !== "done");
  if (existing) return existing;
  const task: HousekeepingTask = {
    id: uid("hk"),
    roomId,
    assignedTo: "Housekeeping",
    status: "todo",
    scheduledFor: new Date().toISOString().slice(0, 10),
    inspected: false,
  };
  housekeeping.set(task.id, task);
  return task;
}

export function hotelCheckIn(reservationId: string, roomId: string, issuedBy: string) {
  const reservation = reservations.get(reservationId);
  const room = rooms.get(roomId);
  if (!reservation || !room) return null;

  const updatedReservation: HotelReservation = { ...reservation, roomId, status: "in_casa" };
  reservations.set(reservationId, updatedReservation);
  setRoomStatus(roomId, "occupata");

  const existingStay = [...stays.values()].find((stay) => stay.reservationId === reservationId && !stay.actualCheckOutAt);
  const stay =
    existingStay ||
    {
      id: uid("stay"),
      reservationId,
      roomId,
      actualCheckInAt: new Date().toISOString(),
      actualCheckOutAt: null,
    };
  stays.set(stay.id, stay);

  const card: HotelKeycard = {
    id: uid("card"),
    roomId,
    reservationId,
    validFrom: new Date().toISOString(),
    validUntil: `${updatedReservation.checkOutDate}T11:00:00Z`,
    status: "attiva",
    issuedBy,
  };
  keycards.set(card.id, card);

  return { reservation: updatedReservation, room: rooms.get(roomId)!, stay, card };
}

export function hotelCheckOut(reservationId: string) {
  const reservation = reservations.get(reservationId);
  if (!reservation || !reservation.roomId) return null;

  const updatedReservation: HotelReservation = { ...reservation, status: "check_out" };
  reservations.set(reservationId, updatedReservation);
  setRoomStatus(reservation.roomId, "da_pulire");

  const stay = [...stays.values()].find((item) => item.reservationId === reservationId && !item.actualCheckOutAt);
  const updatedStay = stay ? { ...stay, actualCheckOutAt: new Date().toISOString() } : null;
  if (updatedStay) stays.set(updatedStay.id, updatedStay);

  const relatedCards = [...keycards.values()].filter((card) => card.reservationId === reservationId && card.status === "attiva");
  for (const card of relatedCards) keycards.set(card.id, { ...card, status: "annullata" });

  const task = ensureCheckoutTask(reservation.roomId);

  return {
    reservation: updatedReservation,
    room: rooms.get(reservation.roomId)!,
    stay: updatedStay,
    housekeepingTask: task,
    keycards: relatedCards.map((card) => keycards.get(card.id)!),
  };
}

export const hotelStore = {
  rooms: {
    all: () => [...rooms.values()],
    get: (id: string) => rooms.get(id),
    set: (id: string, room: HotelRoom) => rooms.set(id, room),
    create: (data: Omit<HotelRoom, "id">) => {
      const created = { ...data, id: uid("hr") };
      rooms.set(created.id, created);
      return created;
    },
    update: (id: string, data: Partial<HotelRoom>) => {
      const existing = rooms.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data, id };
      rooms.set(id, updated);
      return updated;
    },
    delete: (id: string) => rooms.delete(id),
  },
  reservations: {
    all: () => [...reservations.values()],
    get: (id: string) => reservations.get(id),
    set: (id: string, reservation: HotelReservation) => reservations.set(id, reservation),
    create: (data: Omit<HotelReservation, "id">) => {
      const created = { ...data, id: uid("res") };
      reservations.set(created.id, created);
      return created;
    },
    update: (id: string, data: Partial<HotelReservation>) => {
      const existing = reservations.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data, id };
      reservations.set(id, updated);
      return updated;
    },
    delete: (id: string) => reservations.delete(id),
  },
  stays: {
    all: () => [...stays.values()],
    get: (id: string) => stays.get(id),
    set: (id: string, stay: HotelStay) => stays.set(id, stay),
  },
  housekeeping: {
    all: () => [...housekeeping.values()],
    get: (id: string) => housekeeping.get(id),
    set: (id: string, task: HousekeepingTask) => housekeeping.set(id, task),
  },
  keycards: {
    all: () => [...keycards.values()],
    get: (id: string) => keycards.get(id),
    set: (id: string, card: HotelKeycard) => keycards.set(id, card),
  },
};
