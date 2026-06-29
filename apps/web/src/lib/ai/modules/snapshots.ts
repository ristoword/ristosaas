import { prisma } from "@/lib/db/prisma";
import type { RestaurantOrderArea } from "@prisma/client";
import { aiKitchenRepository } from "@/lib/db/repositories/ai-kitchen.repository";
import { aiCantinaRepository } from "@/lib/db/repositories/ai-cantina.repository";
import { operationalBriefingRepository } from "@/lib/db/repositories/operational-briefing.repository";
import { unifiedReportsRepository } from "@/lib/db/repositories/unified-reports.repository";
import { reportTrendsRepository } from "@/lib/db/repositories/report-trends.repository";
import { haccpRepository } from "@/lib/db/repositories/haccp.repository";
import { customersRepository } from "@/lib/db/repositories/customers.repository";
import { hardwareRepository } from "@/lib/db/repositories/hardware.repository";
import { supervisorStorniRepository } from "@/lib/db/repositories/supervisor-storni.repository";
import type { ModuleSnapshotOptions } from "@/lib/ai/modules/types";

function dayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function ordersByArea(tenantId: string, area: RestaurantOrderArea) {
  const { start, end } = dayBounds();
  const orders = await prisma.restaurantOrder.findMany({
    where: {
      tenantId,
      createdAt: { gte: start, lte: end },
      status: { notIn: ["annullato"] },
      items: { some: { area } },
    },
    include: { items: { where: { area } } },
  });
  const revenue = orders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + Number(i.price) * i.qty, 0),
    0,
  );
  return {
    activeOrders: orders.filter((o) => !["chiuso", "servito"].includes(o.status)).length,
    ordersToday: orders.length,
    revenueToday: Math.round(revenue * 100) / 100,
    pendingItems: orders.flatMap((o) =>
      o.items.map((i) => ({ table: o.table, name: i.name, qty: i.qty, status: o.status })),
    ).slice(0, 20),
  };
}

export const moduleSnapshots = {
  sala: async ({ tenantId }: ModuleSnapshotOptions) => {
    const { start, end } = dayBounds();
    const [activeOrders, bookings] = await Promise.all([
      prisma.restaurantOrder.findMany({
        where: { tenantId, createdAt: { gte: start, lte: end }, status: { notIn: ["annullato", "chiuso"] } },
        select: { id: true, table: true, status: true, covers: true, waiter: true },
        take: 50,
      }),
      prisma.booking.findMany({
        where: { tenantId, date: { gte: start, lte: end } },
        select: { id: true, time: true, customerName: true, guests: true, status: true, table: true },
        take: 30,
      }),
    ]);
    return { activeOrders, bookingsToday: bookings, tablesOccupied: activeOrders.length };
  },

  cassa: async ({ tenantId }: ModuleSnapshotOptions) => {
    const { start, end } = dayBounds();
    const orders = await prisma.archivedOrder.findMany({
      where: { tenantId, closedAt: { gte: start, lte: end }, status: "completato" },
      select: { total: true, paymentMethod: true },
    });
    const revenue = orders.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const trends = await reportTrendsRepository.snapshot(tenantId);
    return {
      ordersClosedToday: orders.length,
      revenueToday: Math.round(revenue * 100) / 100,
      paymentMix: orders.reduce<Record<string, number>>((acc, o) => {
        const k = o.paymentMethod || "altro";
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {}),
      trends: trends.day,
    };
  },

  kitchen: async ({ tenantId, periodDays = 14 }: ModuleSnapshotOptions) =>
    aiKitchenRepository.operationalSnapshot(tenantId, periodDays),

  pizzeria: async ({ tenantId }: ModuleSnapshotOptions) => ordersByArea(tenantId, "pizzeria"),

  bar: async ({ tenantId }: ModuleSnapshotOptions) => ordersByArea(tenantId, "bar"),

  inventory: async ({ tenantId, periodDays = 14 }: ModuleSnapshotOptions) => {
    const op = await aiKitchenRepository.operationalSnapshot(tenantId, periodDays);
    return {
      reorder: op.reorder,
      warehouse: op.warehouse,
      kpi: op.kpi,
      generatedAt: op.generatedAt,
    };
  },

  foodcost: async ({ tenantId, periodDays = 14 }: ModuleSnapshotOptions) => {
    const op = await aiKitchenRepository.operationalSnapshot(tenantId, periodDays);
    return {
      foodCost: op.foodCost,
      dynamicPricing: op.dynamicPricing,
      managerReport: {
        averageMarginPct: op.managerReport.averageMarginPct,
        dailyLossEstimate: op.managerReport.dailyLossEstimate,
        dishesToRemove: op.managerReport.dishesToRemove,
      },
      generatedAt: op.generatedAt,
    };
  },

  cantina: async ({ tenantId }: ModuleSnapshotOptions) => aiCantinaRepository.snapshot(tenantId),

  crm: async ({ tenantId }: ModuleSnapshotOptions) => {
    const customers = await customersRepository.all(tenantId);
    const vip = customers.filter((c) => c.type === "vip").length;
    const withAllergies = customers.filter((c) => c.allergies.trim()).length;
    return {
      totalCustomers: customers.length,
      vipCount: vip,
      withAllergies,
      topSpenders: customers
        .slice()
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10)
        .map((c) => ({ name: c.name, totalSpent: c.totalSpent, visits: c.visits, type: c.type })),
    };
  },

  haccp: async ({ tenantId }: ModuleSnapshotOptions) => {
    const entries = await haccpRepository.list(tenantId, { limit: 50 });
    const nonConform = entries.filter((e) => e.conforme === false).length;
    const today = new Date().toISOString().slice(0, 10);
    const todayEntries = entries.filter((e) => e.recordedAt.startsWith(today)).length;
    return { recentEntries: entries.slice(0, 20), nonConformCount: nonConform, entriesToday: todayEntries };
  },

  hotel: async ({ tenantId }: ModuleSnapshotOptions) => {
    const { start, end } = dayBounds();
    const [rooms, arrivals, departures, reservations] = await Promise.all([
      prisma.hotelRoom.groupBy({ by: ["status"], where: { tenantId }, _count: true }),
      prisma.hotelReservation.count({
        where: { tenantId, checkInDate: { gte: start, lte: end }, status: { notIn: ["cancellata"] } },
      }),
      prisma.hotelReservation.count({
        where: { tenantId, checkOutDate: { gte: start, lte: end }, status: "in_casa" },
      }),
      prisma.hotelReservation.findMany({
        where: { tenantId, status: { in: ["confermata", "in_casa"] } },
        select: { guestName: true, roomId: true, checkInDate: true, checkOutDate: true, status: true },
        take: 20,
      }),
    ]);
    return { roomStatus: rooms, arrivalsToday: arrivals, departuresToday: departures, activeReservations: reservations };
  },

  reception: async ({ tenantId }: ModuleSnapshotOptions) => {
    const { start, end } = dayBounds();
    const [arrivals, openFolios, stays] = await Promise.all([
      prisma.hotelReservation.findMany({
        where: { tenantId, checkInDate: { gte: start, lte: end } },
        select: { guestName: true, roomId: true, status: true, guests: true },
        take: 20,
      }),
      prisma.guestFolio.count({ where: { tenantId, status: "open" } }),
      prisma.stay.count({ where: { tenantId, actualCheckOutAt: null } }),
    ]);
    return { arrivalsToday: arrivals, openFolios, activeStays: stays };
  },

  housekeeping: async ({ tenantId }: ModuleSnapshotOptions) => {
    const tasks = await prisma.housekeepingTask.findMany({
      where: { tenantId, status: { not: "done" } },
      include: { room: { select: { code: true, hkPmsCode: true, status: true } } },
      take: 40,
    });
    const dirtyRooms = await prisma.hotelRoom.count({
      where: { tenantId, OR: [{ status: "da_pulire" }, { hkPmsCode: { in: ["VD", "DIRTY", "OD"] } }] },
    });
    return {
      pendingCount: tasks.length,
      dirtyRooms,
      tasks: tasks.map((t) => ({
        roomCode: t.room?.code,
        pmsCode: t.room?.hkPmsCode,
        status: t.status,
        priority: t.priority,
        taskType: t.taskType,
      })),
    };
  },

  prenotazioni: async ({ tenantId }: ModuleSnapshotOptions) => {
    const { start, end } = dayBounds();
    const bookings = await prisma.booking.findMany({
      where: { tenantId, date: { gte: start, lte: end } },
      orderBy: { time: "asc" },
    });
    return {
      totalToday: bookings.length,
      totalCovers: bookings.reduce((s, b) => s + (b.guests ?? 0), 0),
      list: bookings.slice(0, 30),
    };
  },

  "room-service": async ({ tenantId }: ModuleSnapshotOptions) => {
    const orders = await prisma.roomServiceOrder.findMany({
      where: { tenantId, status: { notIn: ["delivered", "cancelled"] } },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return { pendingCount: orders.length, orders };
  },

  catering: async ({ tenantId }: ModuleSnapshotOptions) => {
    const events = await prisma.cateringEvent.findMany({
      where: { tenantId, status: { notIn: ["annullato"] } },
      orderBy: { date: "asc" },
      take: 20,
    });
    return { upcomingEvents: events };
  },

  staff: async ({ tenantId }: ModuleSnapshotOptions) => {
    const { start, end } = dayBounds();
    const [members, shifts, rewards] = await Promise.all([
      prisma.staffMember.count({ where: { tenantId, status: "attivo" } }),
      prisma.staffShift.findMany({
        where: { tenantId, clockInAt: { gte: start, lte: end } },
        include: { staffMember: { select: { name: true } } },
        take: 30,
      }),
      prisma.staffReward.findMany({
        where: { tenantId, createdAt: { gte: start, lte: end } },
        take: 10,
      }),
    ]);
    return { activeStaff: members, shiftsToday: shifts, rewardsToday: rewards };
  },

  turni: async ({ tenantId }: ModuleSnapshotOptions) => {
    const plans = await prisma.shiftPlan.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    return { recentPlans: plans };
  },

  dashboard: async ({ tenantId, userId }: ModuleSnapshotOptions) => {
    const briefing = await operationalBriefingRepository.build(tenantId, userId ?? "");
    const trends = await reportTrendsRepository.snapshot(tenantId);
    return { briefing, trends: trends.day };
  },

  owner: async ({ tenantId }: ModuleSnapshotOptions) => {
    const [unified, trends, license] = await Promise.all([
      unifiedReportsRepository.snapshot(tenantId),
      reportTrendsRepository.snapshot(tenantId),
      prisma.tenantLicense.findFirst({ where: { tenantId }, orderBy: { expiresAt: "desc" } }),
    ]);
    return { unified, trends, license: license ? { status: license.status, seats: license.seats, expiresAt: license.expiresAt } : null };
  },

  supervisor: async ({ tenantId, periodDays = 14 }: ModuleSnapshotOptions) => {
    const [unified, operational, storni] = await Promise.all([
      unifiedReportsRepository.snapshot(tenantId),
      aiKitchenRepository.operationalSnapshot(tenantId, periodDays),
      supervisorStorniRepository.list(tenantId).then((rows) => rows.slice(0, 15)),
    ]);
    return {
      unified,
      managerReport: operational.managerReport,
      foodCostAlerts: operational.foodCost.filter((f) => f.status !== "healthy").slice(0, 10),
      recentStorni: storni,
    };
  },

  "super-admin": async ({ tenantId }: ModuleSnapshotOptions) => {
    const [tenant, users, sessions] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true, plan: true, accessStatus: true } }),
      prisma.user.count({ where: { tenantId } }),
      prisma.userSession.count({ where: { tenantId, revokedAt: null } }),
    ]);
    return { tenant, userCount: users, activeSessions: sessions };
  },

  hardware: async ({ tenantId }: ModuleSnapshotOptions) => {
    const [devices, routes] = await Promise.all([
      hardwareRepository.listDevices(tenantId),
      hardwareRepository.listRoutes(tenantId),
    ]);
    const offline = devices.filter((d) => d.status === "offline").length;
    return { devices, printRoutes: routes, offlineCount: offline, totalDevices: devices.length };
  },

  qr: async ({ tenantId }: ModuleSnapshotOptions) => {
    const [tables, rooms] = await Promise.all([
      prisma.restaurantTable.count({ where: { tenantId } }),
      prisma.hotelRoom.count({ where: { tenantId } }),
    ]);
    return { restaurantTables: tables, hotelRooms: rooms };
  },

  licenses: async ({ tenantId }: ModuleSnapshotOptions) => {
    const license = await prisma.tenantLicense.findFirst({
      where: { tenantId },
      orderBy: { expiresAt: "desc" },
    });
    const subscription = await prisma.billingSubscription.findFirst({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
    });
    return {
      license: license
        ? {
            status: license.status,
            plan: license.plan,
            seats: license.seats,
            usedSeats: license.usedSeats,
            expiresAt: license.expiresAt.toISOString(),
          }
        : null,
      subscription: subscription
        ? { status: subscription.status, stripeSubscriptionId: subscription.stripeSubscriptionId }
        : null,
    };
  },
};
