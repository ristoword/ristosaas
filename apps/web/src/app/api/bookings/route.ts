import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { operationsRepository } from "@/lib/db/repositories/operations.repository";

const BOOKING_ROLES = ["sala", "cassa", "supervisor"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...BOOKING_ROLES]);
  if (guard.error) return guard.error;
  return ok(await operationsRepository.bookings.list(getTenantId()));
}
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...BOOKING_ROLES]);
  if (guard.error) return guard.error;
  const data = await body<any>(req);
  if (!data.customerName?.trim()) return err("customerName required");
  const item = await operationsRepository.bookings.create(getTenantId(), data);
  return ok(item, 201);
}
