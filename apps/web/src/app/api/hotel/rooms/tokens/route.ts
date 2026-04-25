import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { createRoomToken } from "@/lib/security/room-token";

const TOKEN_ROLES = ["hotel_manager", "reception", "supervisor", "owner", "super_admin"] as const;

/**
 * POST /api/hotel/rooms/tokens
 * Generate deterministic HMAC-signed tokens for a batch of hotel room codes.
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...TOKEN_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const payload = await body<{ roomCodes?: unknown }>(req);
  const raw = Array.isArray(payload?.roomCodes) ? payload.roomCodes : [];
  const roomCodes = raw
    .filter((x): x is string => typeof x === "string" && x.length > 0 && x.length < 20)
    .slice(0, 500);

  if (roomCodes.length === 0) return err("roomCodes required", 400);

  const owned = await prisma.hotelRoom.findMany({
    where: { tenantId, code: { in: roomCodes } },
    select: { id: true, code: true, roomType: true, floor: true },
  });

  const tokens = owned.map((r) => ({
    id: r.id,
    code: r.code,
    roomType: r.roomType,
    floor: r.floor,
    token: createRoomToken({ tenantId, roomCode: r.code }),
  }));

  return ok({ tokens });
}
