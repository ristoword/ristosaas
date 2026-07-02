import { NextRequest } from "next/server";
import { ok, err, fireAndForget } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { actorFromRequest, postFolioCharge } from "@/lib/hotel/folio-service";
import { resolveOpenFolioForRoom } from "@/lib/hotel/room-service-folio";

const CHARGE_ROLES = ["hotel_manager", "supervisor", "owner", "super_admin"] as const;

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/hotel/room-service/:id/charge — addebita ordine al folio dell'ospite */
export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...CHARGE_ROLES]);
  if (guard.error) return guard.error;

  const { id } = await ctx.params;
  const tenantId = getTenantId();

  const order = await prisma.roomServiceOrder.findFirst({
    where: { id, tenantId },
    select: { id: true, roomCode: true, guestName: true, category: true, total: true, status: true, chargedToFolio: true, folioId: true, stayId: true },
  });
  if (!order) return err("Ordine non trovato", 404);
  if (order.chargedToFolio) return err("Ordine già addebitato al folio", 400);
  if (order.status !== "delivered") return err("L'ordine deve essere consegnato prima di addebitarlo", 400);

  let folioId = order.folioId;

  if (!folioId && order.stayId) {
    const folio = await prisma.guestFolio.findFirst({
      where: { stayId: order.stayId, tenantId, status: "open" },
      select: { id: true },
    });
    folioId = folio?.id ?? null;
  }

  if (!folioId) {
    const resolved = await resolveOpenFolioForRoom(tenantId, order.roomCode, order.guestName);
    folioId = resolved.folioId;
    if (!order.stayId && resolved.stayId) {
      await prisma.roomServiceOrder.update({
        where: { id: order.id },
        data: { stayId: resolved.stayId, folioId: resolved.folioId },
      });
    }
  }

  if (!folioId) return err("Nessun folio aperto per questa camera. Verifica che l'ospite sia in check-in.", 400);

  const categoryLabel: Record<string, string> = {
    food: "Room Service Food",
    laundry: "Lavanderia",
    minibar: "Minibar",
    shoe_cleaning: "Pulizia scarpe",
    linen: "Biancheria extra",
    amenities: "Amenities",
    transport: "Trasporto",
    other: "Servizio extra",
  };
  const description = `${categoryLabel[order.category] ?? order.category} — Camera ${order.roomCode}`;

  const charge = await postFolioCharge({
    tenantId,
    folioId,
    source: "room_service",
    sourceId: order.id,
    description,
    amount: Number(order.total),
    department: "Room Service",
    section: "ROOM_SERVICE",
    actor: actorFromRequest(guard.user, req.headers),
  });

  await prisma.roomServiceOrder.update({
    where: { id },
    data: { chargedToFolio: true, folioChargeId: charge.id, folioId },
  });

  fireAndForget(prisma.notification.create({
    data: {
      tenantId,
      type: "room_service_charge",
      title: `Addebito room service — Camera ${order.roomCode}`,
      message: `€${Number(order.total).toFixed(2)} addebitato al conto di ${order.guestName}`,
      href: "/hotel/folio",
    },
  }), "notification:room-service-charge");

  return ok({ charge });
}
