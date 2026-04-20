import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    if (!key || process.env[key] != null) continue;
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  const checks = {};
  async function q(label, fn) {
    try {
      checks[label] = await fn();
    } catch (error) {
      checks[label] = { error: error instanceof Error ? error.message : String(error) };
    }
  }

  // Warehouse
  await q("warehouseItems", async () => {
    const total = await prisma.warehouseItem.count();
    const underMin = await prisma.warehouseItem.count({ where: { qty: { lte: 0 } } });
    return { total, underMin };
  });
  await q("warehouseMovements_byType", async () => {
    const rows = await prisma.warehouseMovement.groupBy({ by: ["type"], _count: { _all: true } });
    return rows.map((r) => ({ type: r.type, count: r._count._all }));
  });
  await q("warehouseMovements_lastDischarge", async () => {
    const row = await prisma.warehouseMovement.findFirst({
      where: { type: "scarico_comanda" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, reason: true, orderId: true, qty: true, unit: true },
    });
    return row;
  });

  // Orders
  await q("orders_total_byStatus", async () => {
    const rows = await prisma.restaurantOrder.groupBy({ by: ["status"], _count: { _all: true } });
    return rows.map((r) => ({ status: r.status, count: r._count._all }));
  });
  await q("orders_archived", async () => {
    const total = await prisma.archivedOrder.count();
    const lastClosed = await prisma.archivedOrder.findFirst({
      orderBy: { closedAt: "desc" },
      select: { closedAt: true, total: true, paymentMethod: true },
    });
    return { total, lastClosed };
  });

  // Reports
  await q("dailyClosureReports", async () => {
    const total = await prisma.dailyClosureReport.count();
    const recent = await prisma.dailyClosureReport.findFirst({
      orderBy: { date: "desc" },
      select: { date: true, revenue: true, foodSpend: true, staffSpend: true },
    });
    return { total, recent };
  });

  // AI
  await q("aiChatLog", async () => {
    const total = await prisma.aiChatLog.count();
    const errors = await prisma.aiChatLog.count({ where: { errorMessage: { not: null } } });
    const recentErrors = await prisma.aiChatLog.findMany({
      where: { errorMessage: { not: null } },
      take: 3,
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, context: true, errorMessage: true },
    });
    return { total, errors, recentErrors };
  });
  await q("aiProposals", async () => {
    const rows = await prisma.aiProposal.groupBy({ by: ["status"], _count: { _all: true } });
    return rows.map((r) => ({ status: r.status, count: r._count._all }));
  });

  // Staff shifts (clockIn / clockOut)
  await q("staffShifts", async () => {
    const total = await prisma.staffShift.count();
    const activeOpen = await prisma.staffShift.count({ where: { clockOutAt: null } });
    return { total, activeOpen };
  });

  // Recipes / menu
  await q("recipes", async () => ({ total: await prisma.recipe.count() }));
  await q("menuItems", async () => ({ total: await prisma.menuItem.count() }));
  await q("menuItemsWithFoodCost", async () => ({
    total: await prisma.menuItem.count({ where: { foodCostPct: { not: null } } }),
  }));

  // Hotel
  await q("hotelRooms_byStatus", async () => {
    const rows = await prisma.hotelRoom.groupBy({ by: ["status"], _count: { _all: true } });
    return rows.map((r) => ({ status: r.status, count: r._count._all }));
  });
  await q("hotelReservations_byStatus", async () => {
    const rows = await prisma.hotelReservation.groupBy({ by: ["status"], _count: { _all: true } });
    return rows.map((r) => ({ status: r.status, count: r._count._all }));
  });
  await q("guestFolios", async () => ({ total: await prisma.guestFolio.count() }));

  // Billing
  await q("billingSubscriptions", async () => {
    const rows = await prisma.billingSubscription.groupBy({ by: ["status"], _count: { _all: true } });
    return rows.map((r) => ({ status: r.status, count: r._count._all }));
  });

  // Rate limit hits (should usually be 0 in prod unless real traffic)
  await q("rateLimitHits_last24h", async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await prisma.rateLimitHit.groupBy({
      by: ["bucket"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    });
    return rows.map((r) => ({ bucket: r.bucket, count: r._count._all }));
  });

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
