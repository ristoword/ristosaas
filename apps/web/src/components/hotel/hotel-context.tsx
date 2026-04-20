"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { hotelApi, integrationApi, type FolioCharge, type GuestFolio, type HotelKeycard, type HotelReservation, type HotelRoom, type HousekeepingTask, type RatePlan } from "@/lib/api-client";

type HotelContextValue = {
  rooms: HotelRoom[];
  reservations: HotelReservation[];
  housekeeping: HousekeepingTask[];
  keycards: HotelKeycard[];
  folios: GuestFolio[];
  charges: FolioCharge[];
  ratePlans: RatePlan[];
  loading: boolean;
  /** Nomi delle slice che non si sono potute caricare (permessi o errori). */
  failedSlices: string[];
  refresh: () => Promise<void>;
  createRoom: (data: Omit<HotelRoom, "id">) => Promise<void>;
  updateRoom: (id: string, data: Partial<HotelRoom>) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;
  createReservation: (data: Omit<HotelReservation, "id">) => Promise<void>;
  updateReservation: (id: string, data: Partial<HotelReservation>) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;
  roomCharge: (reservationId: string, orderId: string, description: string, amount: number, serviceType: "breakfast" | "lunch" | "dinner") => Promise<FolioCharge>;
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
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedSlices, setFailedSlices] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    // Carichiamo in parallelo ma NON fail-fast: se una sola API va in errore
    // (tipicamente 403 per ruolo senza permessi) continuiamo a popolare il
    // resto. Evita il caso "pagina muta" quando un RBAC disallineato rompe
    // Promise.all.
    const results = await Promise.allSettled([
      hotelApi.listRooms(),
      hotelApi.listReservations(),
      hotelApi.listHousekeeping(),
      hotelApi.listKeycards(),
      integrationApi.listFolios(),
      integrationApi.listCharges(),
      hotelApi.listRatePlans(),
    ]);
    const [roomsR, reservationsR, housekeepingR, keycardsR, foliosR, chargesR, ratePlansR] = results;
    const names = ["rooms", "reservations", "housekeeping", "keycards", "folios", "charges", "ratePlans"] as const;
    const failed: string[] = [];

    if (roomsR.status === "fulfilled") setRooms(roomsR.value); else failed.push(names[0]);
    if (reservationsR.status === "fulfilled") setReservations(reservationsR.value); else failed.push(names[1]);
    if (housekeepingR.status === "fulfilled") setHousekeeping(housekeepingR.value); else failed.push(names[2]);
    if (keycardsR.status === "fulfilled") setKeycards(keycardsR.value); else failed.push(names[3]);
    if (foliosR.status === "fulfilled") setFolios(foliosR.value); else failed.push(names[4]);
    if (chargesR.status === "fulfilled") setCharges(chargesR.value); else failed.push(names[5]);
    if (ratePlansR.status === "fulfilled") setRatePlans(ratePlansR.value); else failed.push(names[6]);

    setFailedSlices(failed);
    setLoading(false);

    if (failed.length > 0 && process.env.NODE_ENV === "development") {
      console.warn("HotelProvider: alcune API hotel non disponibili", failed);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const roomCharge = useCallback(async (reservationId: string, orderId: string, description: string, amount: number, serviceType: "breakfast" | "lunch" | "dinner") => {
    const result = await integrationApi.chargeRoom(reservationId, orderId, description, amount, serviceType);
    setFolios((prev) => {
      const next = prev.filter((folio) => folio.id !== result.folio.id);
      return [result.folio, ...next];
    });
    setCharges((prev) => [...result.credits, result.charge, ...prev]);
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
    <Ctx.Provider value={{ rooms, reservations, housekeeping, keycards, folios, charges, ratePlans, loading, failedSlices, refresh, createRoom, updateRoom, deleteRoom, createReservation, updateReservation, deleteReservation, roomCharge, finalizeCheckout }}>
      {children}
    </Ctx.Provider>
  );
}
