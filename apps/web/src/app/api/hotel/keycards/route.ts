import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import type { HotelKeycard } from "@/modules/hotel/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  const rows = await prisma.hotelKeycard.findMany({
    where: { tenantId: getTenantId() },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      roomId: true,
      reservationId: true,
      validFrom: true,
      validUntil: true,
      status: true,
      issuedBy: true,
    },
  });

  const cards: HotelKeycard[] = rows.map((card) => ({
    id: card.id,
    roomId: card.roomId,
    reservationId: card.reservationId,
    validFrom: card.validFrom.toISOString(),
    validUntil: card.validUntil.toISOString(),
    status: card.status,
    issuedBy: card.issuedBy,
  }));
  return ok(cards);
}
