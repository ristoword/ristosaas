import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { actorFromRequest, mapChargeRow, postFolioCharge } from "@/lib/hotel/folio-service";
import type { FolioCharge, GuestFolio } from "@/modules/integration/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;

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

function paymentMethodLabel(
  method:
    | "contanti"
    | "carta"
    | "bonifico"
    | "altro"
    | "cash"
    | "card"
    | "room_charge_settlement",
): string {
  switch (method) {
    case "cash":
    case "contanti":
      return "contanti";
    case "card":
    case "carta":
      return "carta";
    case "bonifico":
      return "bonifico";
    case "altro":
      return "altro";
    case "room_charge_settlement":
      return "saldo interno";
    default:
      return method;
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  const parsed = await body<{
    reservationId: string;
    amount: number;
    method:
      | "contanti"
      | "carta"
      | "bonifico"
      | "altro"
      | "cash"
      | "card"
      | "room_charge_settlement";
    note?: string;
  }>(req);

  const { reservationId, amount, method, note } = parsed;
  if (!reservationId || amount == null || !method) {
    return err("reservationId, amount e method sono obbligatori");
  }
  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return err("L'importo del pagamento deve essere un numero positivo");
  }

  const tenantId = getTenantId();
  const actor = actorFromRequest(guard.user, req.headers);

  const reservation = await prisma.hotelReservation.findFirst({
    where: { id: reservationId, tenantId, status: "in_casa" },
    include: { stay: true },
  });
  if (!reservation?.roomId) return err("Prenotazione non in casa o senza camera assegnata", 404);
  if (!reservation.stay) return err("Soggiorno non trovato: completa prima il check-in.", 400);

  let folio = await prisma.guestFolio.findFirst({
    where: {
      tenantId,
      OR: [{ stayId: reservation.stay.id }, { customerId: reservation.customerId, status: "open" }],
    },
    orderBy: { id: "asc" },
  });

  if (!folio) {
    folio = await prisma.guestFolio.create({
      data: {
        tenantId,
        customerId: reservation.customerId,
        stayId: reservation.stay.id,
        currency: "EUR",
        balance: 0,
        status: "open",
      },
    });
  }

  const label = paymentMethodLabel(method);
  const notePart = note?.trim() ? ` — ${note.trim()}` : "";
  const paymentId = `pay-${Date.now()}-${reservation.id.slice(-6)}`;

  await postFolioCharge({
    tenantId,
    folioId: folio.id,
    source: "payment",
    sourceId: paymentId,
    description: `Pagamento (${label})${notePart}`,
    amount: -amount,
    department: "Cassa",
    section: "RIMBORSI",
    actor,
  });

  const updatedFolio = await prisma.guestFolio.findUniqueOrThrow({ where: { id: folio.id } });
  const charges = await prisma.folioCharge.findMany({
    where: { folioId: folio.id, lineStatus: { not: "void" } },
    orderBy: { postedAt: "desc" },
  });

  return ok({
    folio: mapFolio(updatedFolio),
    charges: charges.map((c) => mapChargeRow(c)),
    balance: updatedFolio.balance.toNumber(),
  });
}
