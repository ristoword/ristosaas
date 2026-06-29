import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { guestFolioRepository } from "@/lib/db/repositories/guest-folio.repository";
import { customersRepository } from "@/lib/db/repositories/customers.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { actorFromRequest, writeFolioAudit } from "@/lib/hotel/folio-service";
import { analyzeFolio, buildFolioAiPromptContext } from "@/lib/hotel/folio-ai-service";
import { prisma } from "@/lib/db/prisma";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin", "supervisor", "cassa"] as const;

type Ctx = { params: Promise<{ id: string }> };

async function loadFolioContext(tenantId: string, folioId: string) {
  const detail = await guestFolioRepository.getDetail(tenantId, folioId);
  if (!detail) return null;

  let reservation = null;
  if (detail.folio.reservationId) {
    reservation = await prisma.hotelReservation.findFirst({
      where: { id: detail.folio.reservationId, tenantId },
    });
  }

  const customers = await customersRepository.all(tenantId);
  const customer = customers.find((c) => c.id === detail.folio.customerId) ?? null;

  return {
    detail,
    reservation: reservation
      ? {
          id: reservation.id,
          customerId: reservation.customerId,
          guestName: reservation.guestName,
          phone: reservation.phone ?? "",
          email: reservation.email ?? "",
          roomId: reservation.roomId,
          checkInDate: reservation.checkInDate.toISOString().slice(0, 10),
          checkOutDate: reservation.checkOutDate.toISOString().slice(0, 10),
          guests: reservation.guests,
          status: reservation.status,
          roomType: reservation.roomType,
          boardType: reservation.boardType,
          nights: reservation.nights,
          rate: reservation.rate.toNumber(),
          documentCode: reservation.documentCode ?? "",
        }
      : null,
    customer,
  };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;

  const { id } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const loaded = await loadFolioContext(tenantId, id);
  if (!loaded) return err("Folio not found", 404);

  const locale = req.nextUrl.searchParams.get("locale") ?? "it";
  const analysis = analyzeFolio({
    detail: loaded.detail,
    reservation: loaded.reservation,
    customer: loaded.customer,
    locale,
  });

  await writeFolioAudit({
    tenantId,
    folioId: id,
    action: "ai_analyze",
    newValue: `${analysis.anomalies.length} anomalie, checkoutBlocked=${analysis.checkoutBlocked}`,
    actor: actorFromRequest(guard.user, req.headers),
  });

  return ok(analysis);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  return GET(req, ctx);
}
