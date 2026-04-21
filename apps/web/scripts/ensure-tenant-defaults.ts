/**
 * Backfill idempotente: camere hotel minime (se piano hotel), menu/ricette/del giorno.
 * Esegui da apps/web: `pnpm db:ensure-tenant-defaults`
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path: string) {
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

async function main() {
  const { backfillTenantDefaultsAllTenants } = await import(
    "@/lib/db/repositories/tenant-defaults.bootstrap",
  );
  const rows = await backfillTenantDefaultsAllTenants();
  console.log(JSON.stringify({ tenants: rows.length, rows }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
