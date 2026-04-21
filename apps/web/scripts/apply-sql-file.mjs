/**
 * Esegue un file .sql sul DB (una singola istruzione o script senza DO $$ annidati male).
 * Carica DATABASE_URL da .env.local / .env (cwd = apps/web).
 *
 * Uso: node scripts/apply-sql-file.mjs prisma/migrations_add_hotel_room_default_nightly_rate.sql
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
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(resolve(WEB_ROOT, ".env.local"));
loadEnvFile(resolve(WEB_ROOT, ".env"));

const rel = process.argv[2];
if (!rel) {
  console.error("Usage: node scripts/apply-sql-file.mjs <path-to.sql under apps/web>");
  process.exit(1);
}

const abs = resolve(WEB_ROOT, rel);
if (!existsSync(abs)) {
  console.error("File not found:", abs);
  process.exit(1);
}

const sql = readFileSync(abs, "utf8").trim();
if (!sql) {
  console.error("Empty SQL file");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error(JSON.stringify({ ok: false, error: "DATABASE_URL mancante" }));
  process.exit(1);
}

const prisma = new PrismaClient({ log: ["error"] });
try {
  await prisma.$executeRawUnsafe(sql);
  console.log(JSON.stringify({ ok: true, file: rel }, null, 2));
} finally {
  await prisma.$disconnect();
}
