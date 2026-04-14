import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { operationsRepository } from "@/lib/db/repositories/operations.repository";

const CATERING_ROLES = ["owner", "supervisor", "sala", "cassa", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, CATERING_ROLES);
  if (guard.error) return guard.error;
  return ok(await operationsRepository.catering.list(getTenantId()));
}
export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, CATERING_ROLES);
  if (guard.error) return guard.error;
  const data = await body<any>(req);
  if (!data.name?.trim()) return err("name required");
  const item = await operationsRepository.catering.create(getTenantId(), data);
  return ok(item, 201);
}
