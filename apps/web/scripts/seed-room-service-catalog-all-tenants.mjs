/**
 * Inserisce il catalogo room service per TUTTI i tenant nel sistema.
 * Idempotente: usa upsert su ID prefissati per tenant.
 * Esegui con: node scripts/seed-room-service-catalog-all-tenants.mjs
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
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = line.slice(idx + 1).trim();
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

const CATALOG = [
  { suffix: "1",  name: "Club Sandwich",          category: "food",          unitPrice: 14,  unit: "pz",  sortOrder: 1,  active: true },
  { suffix: "2",  name: "Insalata Caprese",        category: "food",          unitPrice: 10,  unit: "pz",  sortOrder: 2,  active: true },
  { suffix: "3",  name: "Frutta di Stagione",      category: "food",          unitPrice: 7,   unit: "pz",  sortOrder: 3,  active: true },
  { suffix: "9",  name: "Colazione in camera",     category: "food",          unitPrice: 18,  unit: "set", sortOrder: 4,  active: true },
  { suffix: "4",  name: "Acqua Naturale 75cl",     category: "minibar",       unitPrice: 3,   unit: "bt",  sortOrder: 10, active: true },
  { suffix: "5",  name: "Acqua Frizzante 75cl",    category: "minibar",       unitPrice: 3,   unit: "bt",  sortOrder: 11, active: true },
  { suffix: "6",  name: "Birra in lattina",        category: "minibar",       unitPrice: 4.5, unit: "pz",  sortOrder: 12, active: true },
  { suffix: "7",  name: "Vino Bianco (mezza)",     category: "minibar",       unitPrice: 9,   unit: "bt",  sortOrder: 13, active: true },
  { suffix: "8",  name: "Snack misti",             category: "minibar",       unitPrice: 5,   unit: "pz",  sortOrder: 14, active: true },
  { suffix: "10", name: "Lavaggio camicia",        category: "laundry",       unitPrice: 6,   unit: "pz",  sortOrder: 20, active: true },
  { suffix: "11", name: "Lavaggio pantalone",      category: "laundry",       unitPrice: 8,   unit: "pz",  sortOrder: 21, active: true },
  { suffix: "12", name: "Pulizia scarpe",          category: "shoe_cleaning", unitPrice: 5,   unit: "pz",  sortOrder: 30, active: true },
  { suffix: "13", name: "Cuscino extra",           category: "linen",         unitPrice: 3,   unit: "pz",  sortOrder: 40, active: true },
  { suffix: "14", name: "Coperta extra",           category: "linen",         unitPrice: 4,   unit: "pz",  sortOrder: 41, active: true },
  { suffix: "15", name: "Kit benvenuto SPA",       category: "amenities",     unitPrice: 12,  unit: "kit", sortOrder: 50, active: true },
];

async function seedForTenant(tenantId, tenantName) {
  let count = 0;
  for (const item of CATALOG) {
    await prisma.roomServiceCatalogItem.upsert({
      where: { id: `rsc_${tenantId.slice(-8)}_${item.suffix}` },
      update: { tenantId, name: item.name, category: item.category, unitPrice: item.unitPrice, unit: item.unit, sortOrder: item.sortOrder, active: item.active },
      create: { id: `rsc_${tenantId.slice(-8)}_${item.suffix}`, tenantId, name: item.name, category: item.category, unitPrice: item.unitPrice, unit: item.unit, sortOrder: item.sortOrder, active: item.active },
    });
    count++;
  }
  const total = await prisma.roomServiceCatalogItem.count({ where: { tenantId } });
  console.log(`  [OK] ${tenantName} — ${total} voci catalogo`);
}

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  console.log(`Tenants trovati: ${tenants.length}`);
  for (const tenant of tenants) {
    await seedForTenant(tenant.id, tenant.name);
  }
  console.log("\nCatalogo room service inserito per tutti i tenant.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
