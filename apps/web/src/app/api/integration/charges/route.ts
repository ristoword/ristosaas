import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { guestFolioRepository } from "@/lib/db/repositories/guest-folio.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";

const INTEGRATION_ROLES = ["hotel_manager", "reception", "cassa", "supervisor", "owner", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, INTEGRATION_ROLES);
  if (guard.error) return guard.error;
  const charges = await guestFolioRepository.allCharges(getTenantId());
  return ok(charges);
}
