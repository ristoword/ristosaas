import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { operationsRepository } from "@/lib/db/repositories/operations.repository";

const STAFF_SHIFT_ROLES = ["owner", "supervisor", "staff", "super_admin"] as const;

export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, STAFF_SHIFT_ROLES);
  if (guard.error) return guard.error;

  const payload = await body<{ staffId: string; action: "clock_in" | "clock_out"; notes?: string }>(req);
  if (!payload.staffId) return err("staffId required");
  if (payload.action !== "clock_in" && payload.action !== "clock_out") return err("action invalid");

  const tenantId = getTenantId();
  const staff = await operationsRepository.staff.get(tenantId, payload.staffId);
  if (!staff) return err("Staff member not found", 404);

  if (payload.action === "clock_in") {
    const shift = await operationsRepository.staffShifts.clockIn(tenantId, payload.staffId, payload.notes);
    return ok(shift);
  }

  const shift = await operationsRepository.staffShifts.clockOut(tenantId, payload.staffId, payload.notes);
  if (!shift) return err("No active shift for this staff member", 409);
  return ok(shift);
}
