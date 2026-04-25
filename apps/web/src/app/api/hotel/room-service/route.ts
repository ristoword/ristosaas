import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import type { RoomServiceCategory, RoomServiceStatus } from "@prisma/client";

const RS_ROLES = [
  "staff", "reception", "housekeeping", "hotel_manager",
  "supervisor", "owner", "super_admin",
] as const;

const SELECT = {
  id: true, roomCode: true, guestName: true, category: true, status: true,
  items: true, total: true, notes: true, assignedTo: true,
  stayId: true, folioId: true, chargedToFolio: true, folioChargeId: true,
  requestedAt: true, deliveredAt: true, createdAt: true, updatedAt: true,
} as const;

function serialize(r: { requestedAt: Date; createdAt: Date; updatedAt: Date; deliveredAt: Date | null; [k: string]: unknown }) {
  return {
    ...r,
    requestedAt: r.requestedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    deliveredAt: r.deliveredAt?.toISOString() ?? null,
    total: Number(r.total),
  };
}

/** GET /api/hotel/room-service?status=pending&category=food&roomCode=101 */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...RS_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const p = req.nextUrl.searchParams;
  const status = p.get("status") as RoomServiceStatus | null;
  const category = p.get("category") as RoomServiceCategory | null;
  const roomCode = p.get("roomCode");
  const assignedTo = p.get("assignedTo");
  const limit = Math.min(Number(p.get("limit") ?? "100"), 200);

  const rows = await prisma.roomServiceOrder.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(roomCode ? { roomCode } : {}),
      ...(assignedTo ? { assignedTo } : {}),
    },
    orderBy: { requestedAt: "desc" },
    take: limit,
    select: SELECT,
  });

  return ok(rows.map(serialize));
}

/** POST /api/hotel/room-service */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...RS_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const data = await body<{
    roomCode: string;
    guestName: string;
    category: RoomServiceCategory;
    items: Array<{ name: string; qty: number; unitPrice: number; notes?: string }>;
    notes?: string;
    assignedTo?: string;
    stayId?: string;
  }>(req);

  if (!data.roomCode?.trim()) return err("roomCode è obbligatorio", 400);
  if (!data.guestName?.trim()) return err("guestName è obbligatorio", 400);
  if (!data.items?.length) return err("items non può essere vuoto", 400);

  const total = data.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

  let folioId: string | null = null;
  if (data.stayId) {
    const folio = await prisma.guestFolio.findFirst({
      where: { stayId: data.stayId, tenantId, status: "open" },
      select: { id: true },
    });
    folioId = folio?.id ?? null;
  }

  const row = await prisma.roomServiceOrder.create({
    data: {
      tenantId,
      roomCode: data.roomCode.trim(),
      guestName: data.guestName.trim(),
      category: data.category,
      items: data.items,
      total,
      notes: data.notes?.trim() ?? "",
      assignedTo: data.assignedTo?.trim() ?? null,
      stayId: data.stayId ?? null,
      folioId,
    },
    select: SELECT,
  });

  void prisma.notification.create({
    data: {
      tenantId,
      type: "room_service",
      title: `Room Service — Camera ${row.roomCode}`,
      message: `Nuova richiesta ${row.category} per ${row.guestName}`,
      href: "/hotel/room-service",
    },
  }).catch(() => {});

  return ok(serialize(row), 201);
}
