import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { operationsRepository } from "@/lib/db/repositories/operations.repository";

/**
 * POST /api/rooms/ensure-default
 *
 * Returns the first available room for the tenant, creating a default
 * "Sala 1" if none exists yet. Used by the sala UI to wire the
 * "Aggiungi tavolo" button on a blank layout.
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ["owner", "supervisor", "sala", "super_admin"]);
  if (guard.error) return guard.error;
  const room = await operationsRepository.rooms.ensureDefault(getTenantId());
  return ok(room);
}
