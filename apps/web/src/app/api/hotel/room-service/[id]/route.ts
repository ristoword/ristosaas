import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import type { RoomServiceStatus } from "@prisma/client";

const RS_ROLES = [
  "staff", "reception", "housekeeping", "hotel_manager",
  "supervisor", "owner", "super_admin",
] as const;

type Ctx = { params: Promise<{ id: string }> };

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

/** PUT /api/hotel/room-service/:id */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...RS_ROLES]);
  if (guard.error) return guard.error;

  const { id } = await ctx.params;
  const tenantId = getTenantId();

  const existing = await prisma.roomServiceOrder.findFirst({ where: { id, tenantId }, select: { id: true, status: true } });
  if (!existing) return err("Ordine non trovato", 404);

  const data = await body<{
    status?: RoomServiceStatus;
    assignedTo?: string | null;
    notes?: string;
    deliveredAt?: string | null;
  }>(req);

  const deliveredAt = data.status === "delivered" ? new Date() : (data.deliveredAt ? new Date(data.deliveredAt) : undefined);

  const row = await prisma.roomServiceOrder.update({
    where: { id },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo?.trim() ?? null }),
      ...(data.notes !== undefined && { notes: data.notes.trim() }),
      ...(deliveredAt !== undefined && { deliveredAt }),
    },
    select: SELECT,
  });

  return ok(serialize(row));
}

/** DELETE /api/hotel/room-service/:id */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...RS_ROLES]);
  if (guard.error) return guard.error;

  const { id } = await ctx.params;
  const tenantId = getTenantId();

  const existing = await prisma.roomServiceOrder.findFirst({ where: { id, tenantId }, select: { id: true, status: true } });
  if (!existing) return err("Ordine non trovato", 404);
  if (existing.status !== "pending") return err("Solo gli ordini in attesa possono essere eliminati", 400);

  await prisma.roomServiceOrder.delete({ where: { id } });
  return ok({ deleted: true });
}
