"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { hotelApi, integrationApi, type FolioCharge, type GuestFolio, type HotelKeycard, type HotelReservation, type HotelRoom, type HousekeepingTask } from "@/lib/api-client";

type HotelContextValue = {
  rooms: HotelRoom[];
  reservations: HotelReservation[];
  housekeeping: HousekeepingTask[];
  keycards: HotelKeycard[];
  folios: GuestFolio[];
  charges: FolioCharge[];
  loading: boolean;
  refresh: () => Promise<void>;
  createRoom: (data: Omit<HotelRoom, "id">) => Promise<void>;
  updateRoom: (id: string, data: Partial<HotelRoom>) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;
  createReservation: (data: Omit<HotelReservation, "id">) => Promise<void>;
  updateReservation: (id: string, data: Partial<HotelReservation>) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;
  roomCharge: (reservationId: string, orderId: string, description: string, amount: number) => Promise<FolioCharge>;
  finalizeCheckout: (reservationId: string, cityTaxAmount: number, paymentMethod: "cash" | "card" | "room_charge_settlement") => Promise<void>;
};

const Ctx = createContext<HotelContextValue | null>(null);

export function useHotel() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useHotel must be inside HotelProvider");
  return ctx;
}

export function HotelProvider({ children }: { children: React.ReactNode }) {
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [reservations, setReservations] = useState<HotelReservation[]>([]);
  const [housekeeping, setHousekeeping] = useState<HousekeepingTask[]>([]);
  const [keycards, setKeycards] = useState<HotelKeycard[]>([]);
  const [folios, setFolios] = useState<GuestFolio[]>([]);
  const [charges, setCharges] = useState<FolioCharge[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsData, reservationsData, housekeepingData, keycardsData, foliosData, chargesData] = await Promise.all([
        hotelApi.listRooms(),
        hotelApi.listReservations(),
        hotelApi.listHousekeeping(),
        hotelApi.listKeycards(),
        integrationApi.listFolios(),
        integrationApi.listCharges(),
      ]);
      setRooms(roomsData);
      setReservations(reservationsData);
      setHousekeeping(housekeepingData);
      setKeycards(keycardsData);
      setFolios(foliosData);
      setCharges(chargesData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const roomCharge = useCallback(async (reservationId: string, orderId: string, description: string, amount: number) => {
    const result = await integrationApi.chargeRoom(reservationId, orderId, description, amount);
    setFolios((prev) => {
      const next = prev.filter((folio) => folio.id !== result.folio.id);
      return [result.folio, ...next];
    });
    setCharges((prev) => [result.charge, ...prev]);
    return result.charge;
  }, []);

  const createRoom = useCallback(async (data: Omit<HotelRoom, "id">) => {
    const created = await hotelApi.createRoom(data);
    setRooms((prev) => [...prev, created]);
  }, []);

  const updateRoom = useCallback(async (id: string, data: Partial<HotelRoom>) => {
    const updated = await hotelApi.updateRoom(id, data);
    setRooms((prev) => prev.map((room) => (room.id === id ? updated : room)));
  }, []);

  const deleteRoom = useCallback(async (id: string) => {
    await hotelApi.deleteRoom(id);
    setRooms((prev) => prev.filter((room) => room.id !== id));
  }, []);

  const createReservation = useCallback(async (data: Omit<HotelReservation, "id">) => {
    const created = await hotelApi.createReservation(data);
    setReservations((prev) => [...prev, created]);
  }, []);

  const updateReservation = useCallback(async (id: string, data: Partial<HotelReservation>) => {
    const updated = await hotelApi.updateReservation(id, data);
    setReservations((prev) => prev.map((reservation) => (reservation.id === id ? updated : reservation)));
  }, []);

  const deleteReservation = useCallback(async (id: string) => {
    await hotelApi.deleteReservation(id);
    setReservations((prev) => prev.filter((reservation) => reservation.id !== id));
  }, []);

  const finalizeCheckout = useCallback(async (reservationId: string, cityTaxAmount: number, paymentMethod: "cash" | "card" | "room_charge_settlement") => {
    const result = await hotelApi.checkOut(reservationId, cityTaxAmount, paymentMethod);
    setReservations((prev) => prev.map((reservation) => (reservation.id === result.reservation.id ? result.reservation : reservation)));
    setRooms((prev) => prev.map((room) => (room.id === result.room.id ? result.room : room)));
    setHousekeeping((prev) => {
      const next = prev.filter((task) => task.id !== result.housekeepingTask.id);
      return [result.housekeepingTask, ...next];
    });
    setKeycards((prev) =>
      prev.map((card) => result.keycards.find((updated) => updated.id === card.id) || card),
    );
    if (result.folio) {
      setFolios((prev) => {
        const next = prev.filter((folio) => folio.id !== result.folio!.folio.id);
        return [result.folio!.folio, ...next];
      });
      setCharges((prev) => {
        const others = prev.filter((charge) => charge.folioId !== result.folio!.folio.id);
        return [...result.folio!.charges, ...others];
      });
    }
  }, []);

  return (
    <Ctx.Provider value={{ rooms, reservations, housekeeping, keycards, folios, charges, loading, refresh, createRoom, updateRoom, deleteRoom, createReservation, updateReservation, deleteReservation, roomCharge, finalizeCheckout }}>
      {children}
    </Ctx.Provider>
  );
}
