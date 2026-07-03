import { NextRequest } from "next/server";
import { body, err, ok, withErrorHandler } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { mobileAccessService } from "@/lib/hotel/mobile-access-service";
import type { AccessCredentialType } from "@/modules/hotel/domain/mobile-access-types";

const WRITE_ROLES = ["hotel_manager", "reception", "supervisor", "owner", "super_admin"] as const;

export const POST = withErrorHandler(async (req: NextRequest) => {
  const guard = await requireApiUser(req, WRITE_ROLES);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const data = await body<{
    reservationId: string;
    roomId?: string;
    credentialType: AccessCredentialType;
    providerName?: string;
    validFrom?: string;
    validUntil?: string;
  }>(req);

  if (!data.reservationId || !data.credentialType) {
    return err("reservationId e credentialType obbligatori", 400);
  }

  const reservation = await prisma.hotelReservation.findFirst({
    where: { id: data.reservationId, tenantId },
    include: { room: { select: { id: true, code: true } } },
  });
  if (!reservation) return err("Prenotazione non trovata", 404);

  const roomId = data.roomId ?? reservation.roomId;
  if (!roomId) return err("Camera non assegnata alla prenotazione", 400);

  const room = reservation.room ?? (await prisma.hotelRoom.findFirst({ where: { id: roomId, tenantId } }));
  if (!room) return err("Camera non trovata", 404);

  const validFrom = data.validFrom ? new Date(data.validFrom) : new Date();
  const validUntil = data.validUntil
    ? new Date(data.validUntil)
    : new Date(reservation.checkOutDate);

  const result = await mobileAccessService.createCredential({
    tenantId,
    reservationId: reservation.id,
    roomId,
    guestId: reservation.customerId,
    guestName: reservation.guestName,
    roomCode: room.code,
    credentialType: data.credentialType,
    providerName: data.providerName,
    validFrom,
    validUntil,
    actor: {
      userId: guard.user?.id,
      userName: guard.user?.name ?? guard.user?.username,
      userRole: guard.user?.role,
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  });

  return ok(result, 201);
});
