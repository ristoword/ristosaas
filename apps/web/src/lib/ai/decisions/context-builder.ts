import { prisma } from "@/lib/db/prisma";
import { reportTrendsRepository } from "@/lib/db/repositories/report-trends.repository";

export type SupplementalContext = {
  generatedAt: string;
  season: string;
  month: number;
  bookingsNext7Days: { total: number; totalCovers: number; withAllergies: number };
  cateringUpcoming: Array<{ name: string; date: string; guests: number }>;
  hotelTomorrow: {
    arrivals: number;
    departures: number;
    inHouse: number;
    breakfastCovers: number;
    halfBoardGuests: number;
    fullBoardGuests: number;
  };
  salesTrend: {
    dayRevenue: number;
    deltaRevenuePct: number | null;
    forecast7dRevenue: number;
    forecastConfidence: string;
  };
  suppliers: Array<{ name: string; category: string; paymentTerms: string }>;
  recentOrderVelocity: { ordersToday: number; revenueToday: number };
};

function seasonForMonth(month: number): string {
  if (month >= 3 && month <= 5) return "primavera";
  if (month >= 6 && month <= 8) return "estate";
  if (month >= 9 && month <= 11) return "autunno";
  return "inverno";
}

function dayBounds(daysAhead = 0) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (daysAhead) start.setDate(start.getDate() + daysAhead);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function buildSupplementalContext(tenantId: string): Promise<SupplementalContext> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const { start: todayStart, end: todayEnd } = dayBounds();
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const tomorrowStart = dayBounds(1).start;
  const tomorrowEnd = dayBounds(1).end;

  const [
    bookingsWeek,
    cateringEvents,
    hotelArrivals,
    hotelDepartures,
    hotelInHouse,
    hotelTomorrowRes,
    ordersToday,
    archivedToday,
    suppliers,
    trends,
  ] = await Promise.all([
    prisma.booking.findMany({
      where: { tenantId, date: { gte: todayStart, lte: weekEnd }, status: { notIn: ["annullata"] } },
      select: { guests: true, allergies: true },
    }),
    prisma.cateringEvent.findMany({
      where: { tenantId, date: { gte: todayStart }, status: { notIn: ["annullato"] } },
      orderBy: { date: "asc" },
      take: 10,
      select: { name: true, date: true, guests: true },
    }),
    prisma.hotelReservation.count({
      where: { tenantId, checkInDate: { gte: tomorrowStart, lte: tomorrowEnd }, status: { notIn: ["cancellata"] } },
    }),
    prisma.hotelReservation.count({
      where: { tenantId, checkOutDate: { gte: tomorrowStart, lte: tomorrowEnd }, status: "in_casa" },
    }),
    prisma.hotelReservation.count({ where: { tenantId, status: "in_casa" } }),
    prisma.hotelReservation.findMany({
      where: {
        tenantId,
        checkInDate: { lte: tomorrowEnd },
        checkOutDate: { gt: tomorrowStart },
        status: { in: ["confermata", "in_casa"] },
      },
      select: { guests: true, boardType: true },
    }),
    prisma.restaurantOrder.count({
      where: { tenantId, createdAt: { gte: todayStart, lte: todayEnd }, status: { notIn: ["annullato"] } },
    }),
    prisma.archivedOrder.aggregate({
      where: { tenantId, closedAt: { gte: todayStart, lte: todayEnd }, status: "completato" },
      _sum: { total: true },
    }),
    prisma.supplier.findMany({
      where: { tenantId, active: true },
      select: { name: true, category: true, paymentTerms: true },
      take: 20,
    }),
    reportTrendsRepository.snapshot(tenantId),
  ]);

  let breakfastCovers = 0;
  let halfBoardGuests = 0;
  let fullBoardGuests = 0;
  for (const r of hotelTomorrowRes) {
    if (r.boardType !== "room_only") breakfastCovers += r.guests;
    if (r.boardType === "half_board") halfBoardGuests += r.guests;
    if (r.boardType === "full_board") fullBoardGuests += r.guests;
  }

  return {
    generatedAt: now.toISOString(),
    season: seasonForMonth(month),
    month,
    bookingsNext7Days: {
      total: bookingsWeek.length,
      totalCovers: bookingsWeek.reduce((s, b) => s + b.guests, 0),
      withAllergies: bookingsWeek.filter((b) => b.allergies.trim()).length,
    },
    cateringUpcoming: cateringEvents.map((e) => ({
      name: e.name,
      date: e.date.toISOString().slice(0, 10),
      guests: e.guests,
    })),
    hotelTomorrow: {
      arrivals: hotelArrivals,
      departures: hotelDepartures,
      inHouse: hotelInHouse,
      breakfastCovers,
      halfBoardGuests,
      fullBoardGuests,
    },
    salesTrend: {
      dayRevenue: trends.day.revenue,
      deltaRevenuePct: trends.day.deltaRevenuePct,
      forecast7dRevenue: trends.forecast.next7.projectedRevenue,
      forecastConfidence: trends.forecast.next7.confidence,
    },
    suppliers: suppliers.map((s) => ({
      name: s.name,
      category: s.category,
      paymentTerms: s.paymentTerms,
    })),
    recentOrderVelocity: {
      ordersToday,
      revenueToday: Number(archivedToday._sum.total ?? 0),
    },
  };
}
