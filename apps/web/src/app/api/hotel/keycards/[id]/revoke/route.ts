import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { complianceRepository } from "@/lib/db/repositories/compliance.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { revokeLockCredential } from "@/lib/integrations/lock-connector";

type Ctx = { params: Promise<{ id: string }> };

const HOTEL_ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const { id } = await ctx.params;

  const card = await prisma.hotelKeycard.findFirst({ where: { id, tenantId } });
  if (!card) return err("Keycard non trovata", 404);

  const config = await complianceRepository.get(tenantId);
  if (card.lockCredentialId && config.lockEnabled && config.lockBridgeUrl.trim()) {
    const result = await revokeLockCredential(
      config.lockBridgeUrl,
      config.lockBridgeApiKey,
      card.lockCredentialId,
    );
    if (!result.success) {
      return err(result.errorMessage ?? "Revoca serratura fallita", 502);
    }
  }

  const updated = await prisma.hotelKeycard.update({
    where: { id: card.id },
    data: { status: "annullata" },
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
  });
}
