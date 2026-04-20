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

/**
 * Se un tenant ha tavoli con coordinate fuori dal canvas percentuale
 * (x > 100 || y > 100) li ridistribuisce in griglia 5 x N.
 */
function gridPositions(count) {
  const cols = 5;
  const leftPad = 12;
  const rightPad = 12;
  const topPad = 18;
  const rowGap = 24;
  const usableWidth = 100 - leftPad - rightPad;
  const colStep = usableWidth / (cols - 1);
  const out = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    out.push({
      x: Math.round(leftPad + col * colStep),
      y: Math.round(topPad + row * rowGap),
    });
  }
  return out;
}

async function main() {
  const brokenRooms = await prisma.restaurantRoom.findMany({
    where: {
      roomTables: {
        some: { OR: [{ x: { gt: 100 } }, { y: { gt: 100 } }] },
      },
    },
    include: {
      roomTables: { orderBy: { nome: "asc" } },
    },
  });

  const results = [];
  for (const room of brokenRooms) {
    const positions = gridPositions(room.roomTables.length);
    for (let i = 0; i < room.roomTables.length; i++) {
      const t = room.roomTables[i];
      const p = positions[i];
      await prisma.restaurantTable.update({
        where: { id: t.id },
        data: { x: p.x, y: p.y },
      });
    }
    results.push({ roomId: room.id, tenantId: room.tenantId, fixed: room.roomTables.length });
  }
  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
