import { NextRequest } from "next/server";
import { ok, err, body, withErrorHandler} from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { operationsRepository } from "@/lib/db/repositories/operations.repository";

const STAFF_ROLES = ["owner", "supervisor", "staff", "super_admin"] as const;

export const GET = withErrorHandler(async (req) => {
  const guard = await requireApiUser(req, STAFF_ROLES);
  if (guard.error) return guard.error;
  return ok(await operationsRepository.staff.list(getTenantId()));
});
export const POST = withErrorHandler(async (req) => {
  const guard = await requireApiUser(req, STAFF_ROLES);
  if (guard.error) return guard.error;
  const data = await body<any>(req);
  if (!data.name?.trim()) return err("name required");
  const item = await operationsRepository.staff.create(getTenantId(), data);
  return ok(item, 201);
});
