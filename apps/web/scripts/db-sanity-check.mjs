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
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
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

  async function q(label, fn, fallback = null) {
    try {
      checks[label] = await fn();
    } catch (error) {
      checks[label] = { error: error instanceof Error ? error.message : String(error), fallback };
    }
  }

  await q("now", () => prisma.$queryRawUnsafe("SELECT NOW() AS now"));
  await q("tenants", async () => {
    const total = await prisma.tenant.count();
    const blocked = await prisma.tenant.count({ where: { accessStatus: "blocked" } });
    return { total, blocked };
  });
  await q("users", async () => {
    const total = await prisma.user.count();
    const super_admins = await prisma.user.count({ where: { role: "super_admin" } });
    return { total, super_admins };
  });
  await q("platformConfig", async () => {
    const row = await prisma.platformConfig.findUnique({ where: { id: "default" } });
    return row ? { id: row.id, maintenanceMode: row.maintenanceMode } : null;
  });
  await q("rateLimitHit", async () => {
    const count = await prisma.rateLimitHit.count();
    return { count };
  });
  await q("billingEvent_idempotency", async () => {
    const total = await prisma.billingEvent.count();
    const processed = await prisma.billingEvent.count({ where: { status: "processed" } });
    return { total, processed };
  });
  await q("tenantFeature_codes", async () => {
    const rows = await prisma.tenantFeature.groupBy({
      by: ["code"],
      _count: { code: true },
    });
    return rows.map((r) => ({ code: r.code, count: r._count.code }));
  });
  await q("tenantLicense_plans", async () => {
    const rows = await prisma.tenantLicense.groupBy({
      by: ["plan", "status"],
      _count: { _all: true },
    });
    return rows.map((r) => ({ plan: r.plan, status: r.status, count: r._count._all }));
  });
  await q("restaurantTable", async () => {
    const total = await prisma.restaurantTable.count();
    return { total };
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
