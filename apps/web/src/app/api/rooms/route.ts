import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { operationsRepository } from "@/lib/db/repositories/operations.repository";

/** GET /api/rooms — list all rooms */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ["owner", "supervisor", "sala", "cassa", "super_admin"]);
  if (guard.error) return guard.error;
  return ok(await operationsRepository.rooms.list(getTenantId()));
}
