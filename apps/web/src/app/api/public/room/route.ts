import { NextRequest, NextResponse } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { prisma } from "@/lib/db/prisma";
import { applyRateLimit, clientIpFromRequest, rateLimitHeaders } from "@/lib/security/rate-limit";
import { verifyRoomToken } from "@/lib/security/room-token";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/room?token=...
 * Public read-only lookup for a hotel room + room service catalog.
 * No auth required — token is HMAC-signed and rate-limited.
 */
export async function GET(req: NextRequest) {
  const rl = await applyRateLimit(clientIpFromRequest(req), {
    bucket: "public:room",
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    const res = NextResponse.json({ error: "Troppe richieste. Riprova tra poco." }, { status: 429 });
    for (const [k, v] of Object.entries(rateLimitHeaders(rl))) res.headers.set(k, v);
    return res;
  }

  const token = req.nextUrl.searchParams.get("token") ?? "";
  const parsed = verifyRoomToken(token);
  if (!parsed) return err("Token camera non valido.", 400);

  const tenant = await prisma.tenant.findFirst({
    where: { id: parsed.tenantId, accessStatus: "active" },
    select: { id: true, name: true, slug: true },
  });
  if (!tenant) return err("Struttura non attiva.", 403);

  const room = await prisma.hotelRoom.findFirst({
    where: { tenantId: parsed.tenantId, code: parsed.roomCode },
    select: { id: true, code: true, roomType: true, floor: true },
  });
  if (!room) return err("Camera non trovata.", 404);

  const catalog = await prisma.roomServiceCatalogItem.findMany({
    where: { tenantId: parsed.tenantId, active: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, category: true, unitPrice: true, unit: true },
  });

  return ok({
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    room: {
      code: room.code,
      type: room.roomType,
      floor: room.floor,
    },
    catalog: catalog.map((c) => ({ ...c, unitPrice: Number(c.unitPrice) })),
  });
}
