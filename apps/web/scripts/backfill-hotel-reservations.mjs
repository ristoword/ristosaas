/**
 * Backfill prenotazioni hotel demo su tutti i tenant (idempotente).
 * Uso: DATABASE_URL=... node scripts/backfill-hotel-reservations.mjs
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { backfillAllTenantsHotelReservations } from "../prisma/lib/hotel-reservations-bootstrap.mjs";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIdx = line.indexOf("=");
    if (separatorIdx === -1) continue;
    const key = line.slice(0, separatorIdx).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = line.slice(separatorIdx + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
loadEnvFile(path.resolve(currentDir, "../.env"));
loadEnvFile(path.resolve(currentDir, "../.env.local"));

const prisma = new PrismaClient();

async function main() {
  const total = await backfillAllTenantsHotelReservations(prisma);
  console.log(`Fatto: ${total} prenotazioni demo aggiunte in totale.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
