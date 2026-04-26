/**
 * Seed mirato: popola il catalogo Room Service per il tenant demo.
 * Esegui con: node scripts/seed-room-service-catalog.mjs
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
loadEnvFile(path.resolve(currentDir, "../.env.local"));
loadEnvFile(path.resolve(currentDir, "../.env"));

const prisma = new PrismaClient();
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "tenant_demo";

const items = [
  { id: "rsc_1",  name: "Club Sandwich",          category: "food",          unitPrice: 14,  unit: "pz",  sortOrder: 1,  active: true },
  { id: "rsc_2",  name: "Insalata Caprese",        category: "food",          unitPrice: 10,  unit: "pz",  sortOrder: 2,  active: true },
  { id: "rsc_3",  name: "Frutta di Stagione",      category: "food",          unitPrice: 7,   unit: "pz",  sortOrder: 3,  active: true },
  { id: "rsc_9",  name: "Colazione in camera",     category: "food",          unitPrice: 18,  unit: "set", sortOrder: 4,  active: true },
  { id: "rsc_4",  name: "Acqua Naturale 75cl",     category: "minibar",       unitPrice: 3,   unit: "bt",  sortOrder: 10, active: true },
  { id: "rsc_5",  name: "Acqua Frizzante 75cl",    category: "minibar",       unitPrice: 3,   unit: "bt",  sortOrder: 11, active: true },
  { id: "rsc_6",  name: "Birra in lattina",        category: "minibar",       unitPrice: 4.5, unit: "pz",  sortOrder: 12, active: true },
  { id: "rsc_7",  name: "Vino Bianco (mezza)",     category: "minibar",       unitPrice: 9,   unit: "bt",  sortOrder: 13, active: true },
  { id: "rsc_8",  name: "Snack misti",             category: "minibar",       unitPrice: 5,   unit: "pz",  sortOrder: 14, active: true },
  { id: "rsc_10", name: "Lavaggio camicia",        category: "laundry",       unitPrice: 6,   unit: "pz",  sortOrder: 20, active: true },
  { id: "rsc_11", name: "Lavaggio pantalone",      category: "laundry",       unitPrice: 8,   unit: "pz",  sortOrder: 21, active: true },
  { id: "rsc_12", name: "Pulizia scarpe",          category: "shoe_cleaning", unitPrice: 5,   unit: "pz",  sortOrder: 30, active: true },
  { id: "rsc_13", name: "Cuscino extra",           category: "linen",         unitPrice: 3,   unit: "pz",  sortOrder: 40, active: true },
  { id: "rsc_14", name: "Coperta extra",           category: "linen",         unitPrice: 4,   unit: "pz",  sortOrder: 41, active: true },
  { id: "rsc_15", name: "Kit benvenuto SPA",       category: "amenities",     unitPrice: 12,  unit: "kit", sortOrder: 50, active: true },
];

async function main() {
  console.log(`Seeding room service catalog per tenant: ${TENANT_ID}`);
  let created = 0;
  let updated = 0;

  for (const item of items) {
    const result = await prisma.roomServiceCatalogItem.upsert({
      where: { id: item.id },
      update: {
        tenantId: TENANT_ID,
        name: item.name,
        category: item.category,
        unitPrice: item.unitPrice,
        unit: item.unit,
        sortOrder: item.sortOrder,
        active: item.active,
      },
      create: {
        id: item.id,
        tenantId: TENANT_ID,
        name: item.name,
        category: item.category,
        unitPrice: item.unitPrice,
        unit: item.unit,
        sortOrder: item.sortOrder,
        active: item.active,
      },
    });
    if (result) {
      // upsert always returns the row — check if it was created or updated
      created++;
    }
    console.log(`  [OK] ${item.name} (${item.category}) — €${item.unitPrice}`);
  }

  const total = await prisma.roomServiceCatalogItem.count({ where: { tenantId: TENANT_ID } });
  console.log(`\nCatalogo room service: ${total} voci attive nel DB.`);
}

main()
  .catch((err) => { console.error("Errore:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
