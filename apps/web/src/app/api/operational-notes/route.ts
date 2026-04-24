import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const NOTE_ROLES = [
  "cucina", "pizzeria", "bar", "sala", "cassa",
  "supervisor", "owner", "super_admin",
] as const;

const VALID_AREAS = ["cucina", "pizzeria", "bar", "sala"] as const;
type NoteArea = (typeof VALID_AREAS)[number];

function isValidArea(v: unknown): v is NoteArea {
  return typeof v === "string" && (VALID_AREAS as readonly string[]).includes(v);
}

/** GET /api/operational-notes?area=pizzeria */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...NOTE_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const area = req.nextUrl.searchParams.get("area");
  if (!isValidArea(area)) return err("area non valida", 400);

  const rows = await prisma.operationalNote.findMany({
    where: { tenantId, area },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, area: true, text: true, createdAt: true },
  });

  return ok(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
}

/** POST /api/operational-notes */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...NOTE_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const data = await body<{ area: string; text: string }>(req);

  if (!isValidArea(data.area)) return err("area non valida", 400);
  if (!data.text?.trim()) return err("text è obbligatorio", 400);

  const row = await prisma.operationalNote.create({
    data: { tenantId, area: data.area, text: data.text.trim() },
    select: { id: true, area: true, text: true, createdAt: true },
  });

  return ok({ ...row, createdAt: row.createdAt.toISOString() }, 201);
}
