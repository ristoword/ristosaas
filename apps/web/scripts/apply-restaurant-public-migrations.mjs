/**
 * Applica le migrazioni SQL menu pubblico / pagamento online su uno o più database.
 *
 * Carica apps/web/.env.local e .env, poi per ogni variabile definita tra:
 *   DATABASE_URL, DATABASE_URL_STAGING, DATABASE_URL_PRODUCTION
 * esegue in ordine:
 *   prisma/migrations_add_restaurant_order_status_pending.sql
 *   prisma/migrations_add_restaurant_order_online_payment.sql
 *
 * Uso: da apps/web → node scripts/apply-restaurant-public-migrations.mjs
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

const TARGET_KEYS = ["DATABASE_URL", "DATABASE_URL_STAGING", "DATABASE_URL_PRODUCTION"];

const FILES = [
  "prisma/migrations_add_restaurant_order_status_pending.sql",
  "prisma/migrations_add_restaurant_order_online_payment.sql",
];

/** Statement separati da una riga vuota (supporta blocchi DO … $$ … $$;). */
function sqlChunks(sql) {
  const stripped = sql
    .split(/\n\s*\n/)
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !/^\s*--/.test(line))
        .join("\n")
        .trim(),
    )
    .filter((s) => s.length > 0);
  return stripped.map((s) => (s.endsWith(";") ? s : `${s};`));
}

async function applySqlFile(prisma, relPath) {
  const abs = resolve(WEB_ROOT, relPath);
  if (!existsSync(abs)) {
    throw new Error(`File mancante: ${abs}`);
  }
  const sql = readFileSync(abs, "utf8");
  const chunks = sqlChunks(sql);
  for (const stmt of chunks) {
    await prisma.$executeRawUnsafe(stmt);
  }
  return chunks.length;
}

async function main() {
  const targets = TARGET_KEYS.filter((k) => process.env[k] && String(process.env[k]).trim().length > 0).map((k) => ({
    key: k,
    url: String(process.env[k]).trim(),
  }));

  if (targets.length === 0) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error:
            "Nessun DATABASE_URL definito. Imposta in apps/web/.env.local almeno DATABASE_URL, opzionalmente DATABASE_URL_STAGING e DATABASE_URL_PRODUCTION.",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const report = [];

  for (const { key, url } of targets) {
    const prisma = new PrismaClient({ datasourceUrl: url, log: ["error"] });
    try {
      const fileResults = [];
      for (const rel of FILES) {
        const n = await applySqlFile(prisma, rel);
        fileResults.push({ file: rel, statements: n });
      }
      report.push({ env: key, ok: true, fileResults });
    } catch (e) {
      report.push({
        env: key,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
      throw e;
    } finally {
      await prisma.$disconnect();
    }
  }

  console.log(JSON.stringify({ ok: true, targets: report }, null, 2));
}

main().catch(() => {
  process.exitCode = 1;
});
