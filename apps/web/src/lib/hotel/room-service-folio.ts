import { prisma } from "@/lib/db/prisma";

/** Risolve stay e folio aperto per una camera con ospite in casa. */
export async function resolveOpenFolioForRoom(
  tenantId: string,
  roomCode: string,
  guestName?: string,
): Promise<{ stayId: string | null; folioId: string | null }> {
  const code = roomCode.trim();
  if (!code) return { stayId: null, folioId: null };

  const room = await prisma.hotelRoom.findFirst({
    where: { tenantId, code },
    select: { id: true },
  });
  if (!room) return { stayId: null, folioId: null };

  const inHouse = await prisma.hotelReservation.findMany({
    where: { tenantId, roomId: room.id, status: "in_casa" },
    select: { id: true, guestName: true },
    orderBy: { checkInDate: "desc" },
  });
  if (inHouse.length === 0) return { stayId: null, folioId: null };

  let reservation = inHouse[0]!;
  const name = guestName?.trim();
  if (name) {
    const byName = inHouse.find((r) => r.guestName.toLowerCase() === name.toLowerCase());
    if (byName) reservation = byName;
  }

  const stay = await prisma.stay.findFirst({
    where: { tenantId, reservationId: reservation.id },
    select: { id: true },
  });
  if (!stay) return { stayId: null, folioId: null };

  const folio = await prisma.guestFolio.findFirst({
    where: { tenantId, stayId: stay.id, status: "open" },
    select: { id: true },
  });

  return { stayId: stay.id, folioId: folio?.id ?? null };
}
