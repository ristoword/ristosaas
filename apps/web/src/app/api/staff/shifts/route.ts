import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { operationsRepository } from "@/lib/db/repositories/operations.repository";

const STAFF_SHIFT_ROLES = ["owner", "supervisor", "staff", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, STAFF_SHIFT_ROLES);
  if (guard.error) return guard.error;

  const staffId = req.nextUrl.searchParams.get("staffId") || undefined;
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const shifts = await operationsRepository.staffShifts.list(getTenantId(), {
    staffId,
    from: from ? new Date(`${from}T00:00:00Z`) : undefined,
    to: to ? new Date(`${to}T23:59:59Z`) : undefined,
  });
  return ok(shifts);
}
