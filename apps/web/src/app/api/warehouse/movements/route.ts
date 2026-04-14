import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { warehouseRepository } from "@/lib/db/repositories/warehouse.repository";

const WAREHOUSE_ROLES = ["magazzino", "supervisor"] as const;

export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;
  const movements = await warehouseRepository.listMovements(getTenantId());
  return ok(movements);
}
