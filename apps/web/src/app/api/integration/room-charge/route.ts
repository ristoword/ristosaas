import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { actorFromRequest, mapChargeRow, postFolioCharge } from "@/lib/hotel/folio-service";
import type { FolioCharge, GuestFolio } from "@/modules/integration/domain/types";

const INTEGRATION_ROLES = ["hotel_manager", "reception", "cassa", "supervisor", "owner", "super_admin"] as const;

function mapFolio(row: {
  id: string;
  tenantId: string;
  customerId: string;
  stayId: string | null;
  currency: string;
  balance: { toNumber: () => number };
  status: GuestFolio["status"];
}): GuestFolio {
  return {
    id: row.id,
    tenantId: row.tenantId,
    customerId: row.customerId,
    stayId: row.stayId,
    currency: row.currency,
    balance: row.balance.toNumber(),
    status: row.status,
  };
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, INTEGRATION_ROLES);
  if (guard.error) return guard.error;

  const { reservationId, orderId, description, amount, serviceType } = await body<{
    reservationId: string;
    orderId: string;
    description: string;
    amount: number;
    serviceType: "breakfast" | "lunch" | "dinner";
  }>(req);

  if (!reservationId || !orderId || !description || !amount || !serviceType) {
    return err("reservationId, orderId, description, amount and serviceType required");
  }
  const tenantId = getTenantId();
  const actor = actorFromRequest(guard.user, req.headers);

  const reservation = await prisma.hotelReservation.findFirst({
    where: { id: reservationId, tenantId },
    include: { stay: true },
  });
  if (!reservation) return err("Reservation not found", 404);

  const folioWhere: Array<{ stayId?: string; customerId?: string; status?: "open" }> = [
    { customerId: reservation.customerId, status: "open" },
  ];
  if (reservation.stay) folioWhere.unshift({ stayId: reservation.stay.id });

  let folio = await prisma.guestFolio.findFirst({
    where: { tenantId, OR: folioWhere },
    orderBy: { id: "asc" },
  });

  if (!folio) {
    folio = await prisma.guestFolio.create({
      data: {
        tenantId,
        customerId: reservation.customerId,
        stayId: reservation.stay?.id ?? null,
        currency: "EUR",
        balance: 0,
        status: "open",
      },
    });
  }

  const charge = await postFolioCharge({
    tenantId,
    folioId: folio.id,
    source: "restaurant",
    sourceId: orderId,
    description,
    amount,
    department: "Ristorante",
    section: "RISTORANTE",
    actor,
  });

  const coveredByMealPlan =
    (reservation.boardType === "bed_breakfast" && serviceType === "breakfast") ||
    (reservation.boardType === "half_board" && ["breakfast", "dinner"].includes(serviceType)) ||
    (reservation.boardType === "full_board" && ["breakfast", "lunch", "dinner"].includes(serviceType));

  if (coveredByMealPlan) {
    await postFolioCharge({
      tenantId,
      folioId: folio.id,
      source: "meal_plan_credit",
      sourceId: `${orderId}-meal-credit`,
      description: `Copertura piano pasti (${serviceType})`,
      amount: -amount,
      department: "PMS",
      section: "SCONTI",
      actor,
    });
  }

  const updatedFolio = await prisma.guestFolio.findUniqueOrThrow({ where: { id: folio.id } });
  const credits = await prisma.folioCharge.findMany({
    where: { folioId: folio.id, source: "meal_plan_credit" },
    orderBy: { postedAt: "desc" },
  });

  return ok({
    folio: mapFolio(updatedFolio),
    charge,
    credits: credits.map((c) => mapChargeRow(c)),
  });
}
