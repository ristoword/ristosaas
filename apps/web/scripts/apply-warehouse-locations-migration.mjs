/**
 * Applica prisma/migrations_add_warehouse_locations.sql
 * Aggiunge scorte per reparto (WarehouseLocationStock) e
 * campi fromLocation/toLocation/note a WarehouseMovement.
 *
 * Uso: da apps/web → node scripts/apply-warehouse-locations-migration.mjs
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(__dirname, "..");

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(resolve(WEB_ROOT, ".env.local"));
loadEnvFile(resolve(WEB_ROOT, ".env"));

const SQL_PATH = resolve(WEB_ROOT, "prisma/migrations_add_warehouse_locations.sql");

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  if (!existsSync(SQL_PATH)) {
    console.error(JSON.stringify({ ok: false, error: "File SQL non trovato: " + SQL_PATH }));
    process.exitCode = 1;
    return;
  }
  const sql = readFileSync(SQL_PATH, "utf8");

  // Split su blocchi DO $$ separati da riga vuota + statement normali con ;
  // Usa un separatore sicuro: splitta su ; mantenendo i blocchi DO $$ intatti
  const chunks = [];
  let current = "";
  let inDollarQuote = false;

  for (const line of sql.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--")) {
      current += line + "\n";
      continue;
    }
    if (trimmed.includes("$$")) {
      inDollarQuote = !inDollarQuote;
    }
    current += line + "\n";
    if (!inDollarQuote && trimmed.endsWith(";")) {
      const stmt = current.trim();
      if (stmt && !stmt.startsWith("--")) chunks.push(stmt);
      current = "";
    }
  }
  if (current.trim()) chunks.push(current.trim());

  const results = [];
  for (const stmt of chunks.filter((s) => s.length > 0 && !s.startsWith("--"))) {
    try {
      await prisma.$executeRawUnsafe(stmt);
      results.push({ ok: true, stmt: stmt.slice(0, 60) });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      results.push({ ok: false, stmt: stmt.slice(0, 60), error: msg });
    }
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(JSON.stringify({ ok: false, results }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ ok: true, applied: results.length, results }, null, 2));
  }
}

main()
  .catch((e) => {
    console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
