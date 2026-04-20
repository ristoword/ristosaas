import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep <= 0) continue;
    const key = line.slice(0, sep).trim();
    if (!key || process.env[key] != null) continue;
    let value = line.slice(sep + 1).trim();
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
  const sqlPath = resolve(process.cwd(), "prisma", "migrations_add_purchase_orders.sql");
  if (!existsSync(sqlPath)) throw new Error(`Missing ${sqlPath}`);
  const sql = readFileSync(sqlPath, "utf8");
  // Dobbiamo rispettare i blocchi DO $$ ... END$$;
  const statements = sql
    .split(/;\s*(?=(?:CREATE|ALTER|DROP|INSERT|DO\b|$))/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    const prepared = stmt.endsWith(";") ? stmt : `${stmt};`;
    await prisma.$executeRawUnsafe(prepared);
  }
  const count = await prisma.purchaseOrder.count().catch(() => null);
  console.log(JSON.stringify({ ok: true, statements: statements.length, purchaseOrders: count }, null, 2));
}

main()
  .catch((err) => {
    console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
