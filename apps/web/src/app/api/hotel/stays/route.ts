import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import type { HotelStay } from "@/modules/hotel/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "owner", "super_admin", "housekeeping"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  const rows = await prisma.stay.findMany({
    where: { tenantId: getTenantId() },
    select: {
      id: true,
      reservationId: true,
      reservation: { select: { roomId: true } },
      actualCheckInAt: true,
      actualCheckOutAt: true,
    },
  });

  const stays: HotelStay[] = rows.map((stay) => ({
    id: stay.id,
    reservationId: stay.reservationId,
    roomId: stay.reservation.roomId ?? "",
    actualCheckInAt: stay.actualCheckInAt ? stay.actualCheckInAt.toISOString() : null,
    actualCheckOutAt: stay.actualCheckOutAt ? stay.actualCheckOutAt.toISOString() : null,
  }));

  return ok(stays);
}
