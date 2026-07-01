import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { complianceRepository } from "@/lib/db/repositories/compliance.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { encodeLockCredential } from "@/lib/integrations/lock-connector";
import { dispatchPrintJobAsync } from "@/lib/integrations/print-dispatcher";

type Ctx = { params: Promise<{ id: string }> };

const HOTEL_ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const { id } = await ctx.params;

  const card = await prisma.hotelKeycard.findFirst({
    where: { id, tenantId },
    include: {
      room: { select: { code: true } },
      reservation: { select: { guestName: true } },
    },
  });
  if (!card) return err("Keycard non trovata", 404);
  if (card.status !== "attiva") return err("La keycard non è attiva", 400);

  const config = await complianceRepository.get(tenantId);
  if (!config.lockEnabled || !config.lockBridgeUrl.trim()) {
    return err("Bridge serrature non configurato — Area Owner → Integrazioni compliance", 400);
  }

  const result = await encodeLockCredential(
    config.lockBridgeUrl,
    config.lockBridgeApiKey,
    config.lockVendor,
    {
      roomCode: card.room.code,
      reservationId: card.reservationId,
      validFrom: card.validFrom.toISOString(),
      validUntil: card.validUntil.toISOString(),
      guestName: card.reservation.guestName,
    },
  );

  if (!result.success) {
    return err(result.errorMessage ?? "Codifica serratura fallita", 502);
  }

  const updated = await prisma.hotelKeycard.update({
    where: { id: card.id },
    data: {
      lockCredentialId: result.credentialId,
      encodedAt: new Date(),
    },
    select: {
      id: true,
      roomId: true,
      reservationId: true,
      validFrom: true,
      validUntil: true,
      status: true,
      issuedBy: true,
      lockCredentialId: true,
      encodedAt: true,
    },
  });

  dispatchPrintJobAsync(tenantId, "keycard_emessa", "reception", [
    `KEYCARD — Camera ${card.room.code}`,
    card.reservation.guestName,
    `Valida fino: ${card.validUntil.toLocaleString("it-IT")}`,
    result.credentialId ?? "",
  ]);

  return ok({
    card: {
      id: updated.id,
      roomId: updated.roomId,
      reservationId: updated.reservationId,
      validFrom: updated.validFrom.toISOString(),
      validUntil: updated.validUntil.toISOString(),
      status: updated.status,
      issuedBy: updated.issuedBy,
      lockCredentialId: updated.lockCredentialId,
      encodedAt: updated.encodedAt?.toISOString() ?? null,
    },
    lock: result,
  });
}
