import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import {
  buildBriefingNarrative,
  operationalBriefingRepository,
} from "@/lib/db/repositories/operational-briefing.repository";

const BRIEFING_ROLES = [
  "owner", "supervisor", "sala", "cucina", "bar", "pizzeria", "cassa", "magazzino",
  "super_admin", "hotel_manager", "reception", "housekeeping",
] as const;

/** GET /api/operational-briefing — snapshot operativo del giorno */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, BRIEFING_ROLES);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const briefing = await operationalBriefingRepository.build(tenantId, guard.user.id);
  const narrative = buildBriefingNarrative(briefing);

  return ok({ briefing, narrative });
}
