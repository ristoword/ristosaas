import { NextRequest, NextResponse } from "next/server";
import { body, err, ok, fireAndForget, withErrorHandler} from "@/lib/api/helpers";
import { prisma } from "@/lib/db/prisma";
import { applyRateLimit, clientIpFromRequest, rateLimitHeaders } from "@/lib/security/rate-limit";
import { verifyRoomToken } from "@/lib/security/room-token";
import type { RoomServiceCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

type OrderItem = { catalogItemId?: string; name: string; qty: number; unitPrice: number; notes?: string };

/**
 * POST /api/public/room-service
 * Guest-facing: create a room service order without authentication.
 * Requires a valid HMAC room token in the body.
 */
export const POST = withErrorHandler(async (req) => {
  const rl = await applyRateLimit(clientIpFromRequest(req), {
    bucket: "public:room-service",
    limit: 20,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    const res = NextResponse.json({ error: "Troppe richieste. Riprova tra poco." }, { status: 429 });
    for (const [k, v] of Object.entries(rateLimitHeaders(rl))) res.headers.set(k, v);
    return res;
  }

  const data = await body<{
    token: string;
    guestName?: string;
    category: RoomServiceCategory;
    items: OrderItem[];
    notes?: string;
  }>(req);

  if (!data.token) return err("Token obbligatorio.", 400);
  const parsed = verifyRoomToken(data.token);
  if (!parsed) return err("Token camera non valido.", 400);
  if (!data.items?.length) return err("Seleziona almeno un servizio.", 400);
  if (data.items.some((i) => !i.name?.trim() || i.qty < 1)) return err("Voci non valide.", 400);

  const tenant = await prisma.tenant.findFirst({
    where: { id: parsed.tenantId, accessStatus: "active" },
    select: { id: true },
  });
  if (!tenant) return err("Struttura non attiva.", 403);

  const catalogItemIds = data.items
    .map((i) => i.catalogItemId)
    .filter((id): id is string => !!id);

  const catalogItems = catalogItemIds.length > 0
    ? await prisma.roomServiceCatalogItem.findMany({
        where: { id: { in: catalogItemIds }, tenantId: parsed.tenantId, active: true },
        select: { id: true, unitPrice: true, name: true },
      })
    : [];

  const catalogMap = new Map(catalogItems.map((c) => [c.id, c]));

  const serverItems = data.items.map((it) => {
    const catalogEntry = it.catalogItemId ? catalogMap.get(it.catalogItemId) : undefined;
    const unitPrice = catalogEntry ? Number(catalogEntry.unitPrice) : it.unitPrice;
    const name = catalogEntry ? catalogEntry.name : it.name;
    return { ...it, name, unitPrice };
  });

  const total = serverItems.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  if (total < 0) return err("Totale non valido.", 400);

  const order = await prisma.roomServiceOrder.create({
    data: {
      tenantId: parsed.tenantId,
      roomCode: parsed.roomCode,
      guestName: data.guestName?.trim() || "Ospite",
      category: data.category,
      items: serverItems,
      total,
      notes: data.notes?.trim() ?? "",
    },
    select: {
      id: true, roomCode: true, guestName: true, category: true,
      status: true, total: true, requestedAt: true,
    },
  });

  fireAndForget(
    prisma.notification.create({
      data: {
        tenantId: parsed.tenantId,
        type: "room_service",
        title: `Room Service — Camera ${order.roomCode}`,
        message: `Nuova richiesta ${order.category} da ospite (QR)`,
        href: "/hotel/room-service",
      },
    }),
    "notification:room-service-public",
  );

  return ok({
    ...order,
    total: Number(order.total),
    requestedAt: order.requestedAt.toISOString(),
  }, 201);
});
