/**
 * Applica prisma/migrations_add_supervisor_storni_voice_fiscal_stubs.sql
 * usando DATABASE_URL da .env.local / .env (stesso caricamento di apply-pending-migrations).
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

const SQL_PATH = resolve(WEB_ROOT, "prisma/migrations_add_supervisor_storni_voice_fiscal_stubs.sql");

function splitSqlStatements(sql) {
  const out = [];
  let buf = "";
  for (const line of sql.split("\n")) {
    const t = line.trim();
    if (t.startsWith("--")) continue;
    buf += (buf ? "\n" : "") + line;
    if (/;\s*$/.test(line)) {
      const s = buf.trim();
      if (s) out.push(s);
      buf = "";
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(JSON.stringify({ ok: false, error: "DATABASE_URL mancante: imposta .env.local o .env in apps/web" }));
    process.exit(1);
  }

  const sql = readFileSync(SQL_PATH, "utf8");
  const statements = splitSqlStatements(sql).filter((s) => !/^--/.test(s.trim()));
  const prisma = new PrismaClient({ log: ["error"] });
  try {
    for (const stmt of statements) {
      await prisma.$executeRawUnsafe(stmt);
    }
    console.log(JSON.stringify({ ok: true, file: "migrations_add_supervisor_storni_voice_fiscal_stubs.sql", statements: statements.length }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
});
