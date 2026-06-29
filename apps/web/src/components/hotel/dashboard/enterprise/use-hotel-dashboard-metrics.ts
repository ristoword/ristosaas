"use client";

import { useMemo } from "react";
import type {
  FolioCharge,
  HotelReservation,
  HotelRoom,
  HousekeepingTask,
} from "@/lib/api-client";
import { todayIso } from "@/lib/date-utils";

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function occupancyForDate(
  date: string,
  rooms: HotelRoom[],
  reservations: HotelReservation[],
): number {
  const total = rooms.length || 1;
  const occupied = reservations.filter(
    (r) =>
      (r.status === "in_casa" || r.status === "confermata") &&
      r.checkInDate <= date &&
      r.checkOutDate > date,
  ).length;
  return Math.round((occupied / total) * 100);
}

export function useHotelDashboardMetrics(
  rooms: HotelRoom[],
  reservations: HotelReservation[],
  housekeeping: HousekeepingTask[],
  charges: FolioCharge[],
  today: string,
) {
  return useMemo(() => {
    const totalRooms = rooms.length || 1;
    const occupiedRooms = rooms.filter((r) => r.status === "occupata").length;
    const availableRooms = rooms.filter((r) => r.status === "libera" || r.status === "pulita").length;
    const dirtyRooms = rooms.filter((r) => r.status === "da_pulire").length;
    const cleanRooms = rooms.filter((r) => r.status === "pulita").length;
    const oooRooms = rooms.filter((r) => r.status === "fuori_servizio").length;
    const maintenanceRooms = rooms.filter((r) => r.status === "manutenzione").length;

    const occupancyPct = Math.round((occupiedRooms / totalRooms) * 100);
    const inHouse = reservations.filter((r) => r.status === "in_casa");
    const adr =
      inHouse.length > 0
        ? inHouse.reduce((s, r) => s + (Number(r.rate) || 0), 0) / inHouse.length
        : 0;
    const revPar = adr * (occupiedRooms / totalRooms);

    const todayRevenue = charges
      .filter((c) => c.postedAt.startsWith(today) && c.source !== "payment")
      .reduce((s, c) => s + Math.abs(Number(c.amount) || 0), 0);

    const monthStart = today.slice(0, 7) + "-01";
    const monthlyRevenue = charges
      .filter((c) => c.source === "hotel" && c.postedAt >= monthStart)
      .reduce((s, c) => s + (Number(c.amount) || 0), 0);

    const arrivalsToday = reservations.filter((r) => r.checkInDate === today);
    const departuresToday = reservations.filter((r) => r.checkOutDate === today);
    const openHousekeeping = housekeeping.filter((t) => t.status !== "done").length;

    const roomStatusCounts = {
      occupied: occupiedRooms,
      available: availableRooms,
      dirty: dirtyRooms,
      clean: cleanRooms,
      ooo: oooRooms,
      maintenance: maintenanceRooms,
    };

    const occupancySeries7 = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i - 6);
      return { date, value: occupancyForDate(date, rooms, reservations) };
    });
    const occupancySeries30 = Array.from({ length: 30 }, (_, i) => {
      const date = addDays(today, i - 29);
      return { date, value: occupancyForDate(date, rooms, reservations) };
    });
    const occupancySeries90 = Array.from({ length: 90 }, (_, i) => {
      const date = addDays(today, i - 89);
      return { date, value: occupancyForDate(date, rooms, reservations) };
    });

    const revenueBreakdown = {
      rooms: charges.filter((c) => c.source === "hotel" && c.postedAt.startsWith(today)).reduce((s, c) => s + Math.abs(c.amount), 0),
      restaurant: charges.filter((c) => c.source === "restaurant" && c.postedAt.startsWith(today)).reduce((s, c) => s + Math.abs(c.amount), 0),
      bar: charges.filter((c) => c.source === "room_service" && c.description.toLowerCase().includes("bar") && c.postedAt.startsWith(today)).reduce((s, c) => s + Math.abs(c.amount), 0),
      spa: charges.filter((c) => c.source === "room_service" && /spa|wellness/i.test(c.description) && c.postedAt.startsWith(today)).reduce((s, c) => s + Math.abs(c.amount), 0),
      extra: charges.filter((c) => ["manual", "room_service", "city_tax", "meal_plan_credit"].includes(c.source) && c.postedAt.startsWith(today)).reduce((s, c) => s + Math.abs(c.amount), 0),
    };

    const reservationStats = {
      confirmed: reservations.filter((r) => r.status === "confermata").length,
      pending: reservations.filter((r) => r.status === "confermata" && r.checkInDate >= today).length,
      noShow: reservations.filter((r) => r.status === "no_show").length,
      overbooking: Math.max(0, arrivalsToday.length + inHouse.length - totalRooms),
      waitlist: reservations.filter((r) => r.status === "cancellata" && r.checkInDate >= today).length,
    };

    const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b);

    return {
      totalRooms,
      occupiedRooms,
      availableRooms,
      occupancyPct,
      adr,
      revPar,
      todayRevenue,
      monthlyRevenue,
      arrivalsToday,
      departuresToday,
      openHousekeeping,
      roomStatusCounts,
      occupancySeries7,
      occupancySeries30,
      occupancySeries90,
      revenueBreakdown,
      reservationStats,
      floors,
      inHouseCount: inHouse.length,
    };
  }, [rooms, reservations, housekeeping, charges, today]);
}

export function useHotelDashboardToday() {
  return todayIso();
}
