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

const TARGETS = [
  "prisma/migrations_add_archived_order_source.sql",
  "prisma/migrations_add_admin_audit_log.sql",
  "prisma/migrations_add_haccp.sql",
  "prisma/migrations_add_user_sessions.sql",
  "prisma/migrations_add_hardware.sql",
];

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  const results = [];
  for (const relPath of TARGETS) {
    const absPath = resolve(process.cwd(), relPath);
    if (!existsSync(absPath)) {
      results.push({ file: relPath, skipped: true, reason: "file_missing" });
      continue;
    }
    const sql = readFileSync(absPath, "utf8");
    const statements = sql
      .split(/;\s*$/gm)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await prisma.$executeRawUnsafe(stmt);
    }
    results.push({ file: relPath, applied: statements.length });
  }
  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
