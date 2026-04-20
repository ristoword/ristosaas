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

const prisma = new PrismaClient({ log: ["error"] });

const DEFAULT_ROOM_NAME = "Sala 1";
const DEFAULT_TABLE_COUNT = 10;
const DRY_RUN = !process.argv.includes("--execute");

/**
 * Griglia percentuale per la pianta sala.
 * La UI (sala-floor.tsx) posiziona con `left: ${t.x}%; top: ${t.y}%`.
 */
function tablePositions(count) {
  const cols = 5;
  const leftPad = 12;
  const rightPad = 12;
  const topPad = 18;
  const rowGap = 24;
  const usableWidth = 100 - leftPad - rightPad;
  const colStep = usableWidth / (cols - 1);
  const positions = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    positions.push({
      x: Math.round(leftPad + col * colStep),
      y: Math.round(topPad + row * rowGap),
    });
  }
  return positions;
}

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: { accessStatus: "active" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: { restaurantRooms: true, restaurantTables: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const planned = [];
  for (const t of tenants) {
    if (t._count.restaurantRooms > 0 || t._count.restaurantTables > 0) {
      planned.push({
        tenant: { id: t.id, name: t.name, slug: t.slug },
        action: "skip_existing",
        rooms: t._count.restaurantRooms,
        tables: t._count.restaurantTables,
      });
      continue;
    }
    planned.push({
      tenant: { id: t.id, name: t.name, slug: t.slug },
      action: "seed",
      roomName: DEFAULT_ROOM_NAME,
      tableCount: DEFAULT_TABLE_COUNT,
    });
  }

  if (DRY_RUN) {
    console.log(JSON.stringify({ dryRun: true, planned }, null, 2));
    return;
  }

  const results = [];
  for (const p of planned) {
    if (p.action !== "seed") {
      results.push({ ...p, executed: false });
      continue;
    }

    const positions = tablePositions(DEFAULT_TABLE_COUNT);
    const createdRoom = await prisma.restaurantRoom.upsert({
      where: { tenantId_name: { tenantId: p.tenant.id, name: DEFAULT_ROOM_NAME } },
      update: { tables: DEFAULT_TABLE_COUNT },
      create: { tenantId: p.tenant.id, name: DEFAULT_ROOM_NAME, tables: DEFAULT_TABLE_COUNT },
    });

    const tableRows = positions.map((pos, idx) => ({
      tenantId: p.tenant.id,
      roomId: createdRoom.id,
      nome: `T${idx + 1}`,
      posti: 4,
      x: pos.x,
      y: pos.y,
      forma: idx % 2 === 0 ? "quadrato" : "tondo",
      stato: "libero",
    }));

    // createMany scoppia se ci sono unique constraint; qui abbiamo tenantId+roomId+nome di fatto unico
    // ma per sicurezza facciamo create in loop idempotente (questo tenant non ha nulla).
    for (const data of tableRows) {
      await prisma.restaurantTable.create({ data });
    }

    results.push({
      ...p,
      executed: true,
      roomId: createdRoom.id,
      createdTables: tableRows.length,
    });
  }

  console.log(JSON.stringify({ dryRun: false, results }, null, 2));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
