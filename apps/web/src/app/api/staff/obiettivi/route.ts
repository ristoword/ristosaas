import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const ALLOWED_ROLES = [
  "supervisor", "owner", "super_admin",
] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ALLOWED_ROLES);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const dateFrom = from ? new Date(from) : startOfDay(new Date());
  const dateTo = to ? new Date(to) : endOfDay(new Date());

  const orders = await prisma.restaurantOrder.findMany({
    where: {
      tenantId,
      createdAt: { gte: dateFrom, lte: dateTo },
      status: { notIn: ["annullato"] },
    },
    include: { items: true },
  });

  const waiterMap = new Map<string, WaiterStats>();

  for (const order of orders) {
    const name = order.waiter || "Sconosciuto";
    if (!waiterMap.has(name)) {
      waiterMap.set(name, {
        name,
        ordersCount: 0,
        tablesServed: new Set(),
        totalCovers: 0,
        totalRevenue: 0,
        itemsSold: 0,
        premiumBottles: 0,
        premiumBottleRevenue: 0,
        courseBreakdown: {} as Record<string, number>,
        categorySales: {} as Record<string, number>,
        avgOrderValue: 0,
        closedOrders: 0,
        billedOrders: 0,
      });
    }
    const stats = waiterMap.get(name)!;
    stats.ordersCount++;
    if (order.table) stats.tablesServed.add(order.table);
    stats.totalCovers += order.covers ?? 0;

    if (["chiuso", "conto_richiesto", "servito"].includes(order.status)) {
      stats.closedOrders++;
    }
    if (["chiuso", "conto_richiesto"].includes(order.status)) {
      stats.billedOrders++;
    }

    for (const item of order.items) {
      const price = Number(item.price ?? 0);
      const lineTotal = price * item.qty;
      stats.totalRevenue += lineTotal;
      stats.itemsSold += item.qty;

      const cat = (item.category ?? "altro").toLowerCase();
      stats.categorySales[cat] = (stats.categorySales[cat] ?? 0) + lineTotal;

      if (isExpensiveBottle(item.name, price)) {
        stats.premiumBottles += item.qty;
        stats.premiumBottleRevenue += lineTotal;
      }
    }
  }

  const rewards = await prisma.staffReward.findMany({
    where: {
      tenantId,
      createdAt: { gte: dateFrom, lte: dateTo },
    },
    orderBy: { createdAt: "desc" },
  });

  const shifts = await prisma.staffShift.findMany({
    where: {
      tenantId,
      clockInAt: { gte: dateFrom, lte: dateTo },
    },
    include: { staffMember: { select: { name: true } } },
  });

  const shiftsByName = new Map<string, { count: number; totalHours: number }>();
  for (const shift of shifts) {
    const sName = shift.staffMember.name;
    if (!shiftsByName.has(sName)) shiftsByName.set(sName, { count: 0, totalHours: 0 });
    const s = shiftsByName.get(sName)!;
    s.count++;
    if (shift.clockOutAt) {
      s.totalHours += (shift.clockOutAt.getTime() - shift.clockInAt.getTime()) / 3600000;
    }
  }

  const leaderboard: StaffObiettivo[] = Array.from(waiterMap.values()).map((w) => {
    const shiftInfo = shiftsByName.get(w.name);
    const waiterRewards = rewards.filter((r) => r.staffName === w.name);
    return {
      name: w.name,
      ordersCount: w.ordersCount,
      tablesServed: w.tablesServed.size,
      totalCovers: w.totalCovers,
      totalRevenue: Math.round(w.totalRevenue * 100) / 100,
      itemsSold: w.itemsSold,
      premiumBottles: w.premiumBottles,
      premiumBottleRevenue: Math.round(w.premiumBottleRevenue * 100) / 100,
      avgOrderValue: w.ordersCount > 0 ? Math.round((w.totalRevenue / w.ordersCount) * 100) / 100 : 0,
      avgCoverValue: w.totalCovers > 0 ? Math.round((w.totalRevenue / w.totalCovers) * 100) / 100 : 0,
      closedOrders: w.closedOrders,
      billedOrders: w.billedOrders,
      categorySales: w.categorySales,
      shiftsCount: shiftInfo?.count ?? 0,
      totalHours: Math.round((shiftInfo?.totalHours ?? 0) * 100) / 100,
      rewards: waiterRewards.map((r) => ({
        id: r.id,
        type: r.type,
        description: r.description,
        value: r.value ? Number(r.value) : null,
        awardedByName: r.awardedByName,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  });

  leaderboard.sort((a, b) => b.totalRevenue - a.totalRevenue);

  return ok({
    period: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
    leaderboard,
    totalOrders: orders.length,
    totalRevenue: Math.round(leaderboard.reduce((s, w) => s + w.totalRevenue, 0) * 100) / 100,
  });
}

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

const PREMIUM_THRESHOLD = 40;
function isExpensiveBottle(name: string, price: number): boolean {
  const lc = name.toLowerCase();
  return price >= PREMIUM_THRESHOLD && (
    lc.includes("bottiglia") || lc.includes("vino") || lc.includes("champagne") ||
    lc.includes("prosecco") || lc.includes("barolo") || lc.includes("brunello") ||
    lc.includes("amarone") || lc.includes("chianti") || lc.includes("magnum")
  );
}

type WaiterStats = {
  name: string;
  ordersCount: number;
  tablesServed: Set<string>;
  totalCovers: number;
  totalRevenue: number;
  itemsSold: number;
  premiumBottles: number;
  premiumBottleRevenue: number;
  courseBreakdown: Record<string, number>;
  categorySales: Record<string, number>;
  avgOrderValue: number;
  closedOrders: number;
  billedOrders: number;
};

type StaffObiettivo = {
  name: string;
  ordersCount: number;
  tablesServed: number;
  totalCovers: number;
  totalRevenue: number;
  itemsSold: number;
  premiumBottles: number;
  premiumBottleRevenue: number;
  avgOrderValue: number;
  avgCoverValue: number;
  closedOrders: number;
  billedOrders: number;
  categorySales: Record<string, number>;
  shiftsCount: number;
  totalHours: number;
  rewards: {
    id: string;
    type: string;
    description: string;
    value: number | null;
    awardedByName: string;
    createdAt: string;
  }[];
};
