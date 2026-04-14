import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { operationsRepository } from "@/lib/db/repositories/operations.repository";

const ARCHIVIO_ROLES = ["owner", "supervisor", "cassa", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, ARCHIVIO_ROLES);
  if (guard.error) return guard.error;
  return ok(await operationsRepository.archivio.list(getTenantId()));
}
export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, ARCHIVIO_ROLES);
  if (guard.error) return guard.error;
  const data = await body<any>(req);
  const item = await operationsRepository.archivio.create(getTenantId(), data);
  return ok(item, 201);
}
