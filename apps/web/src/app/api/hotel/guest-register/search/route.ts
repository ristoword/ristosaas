import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { guestRegisterRepository } from "@/lib/hotel/guest-register-service";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import type { GuestRegisterEntryStatus, GuestRegisterTransmissionStatus } from "@/modules/hotel/domain/guest-register-types";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin", "supervisor"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const sp = req.nextUrl.searchParams;

  const result = await guestRegisterRepository.search(tenantId, {
    query: sp.get("query") || undefined,
    firstName: sp.get("firstName") || undefined,
    lastName: sp.get("lastName") || undefined,
    roomCode: sp.get("roomCode") || undefined,
    documentNumber: sp.get("documentNumber") || undefined,
    nationality: sp.get("nationality") || undefined,
    arrivalFrom: sp.get("arrivalFrom") || undefined,
    arrivalTo: sp.get("arrivalTo") || undefined,
    departureFrom: sp.get("departureFrom") || undefined,
    departureTo: sp.get("departureTo") || undefined,
    transmissionStatus: (sp.get("transmissionStatus") as GuestRegisterTransmissionStatus) || undefined,
    status: (sp.get("status") as GuestRegisterEntryStatus) || undefined,
    page: sp.get("page") ? Number(sp.get("page")) : 1,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 25,
  });

  return ok(result);
}
