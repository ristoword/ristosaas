import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { reservationGroupsRepository } from "@/lib/db/repositories/hotel-reservations.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";

const HOTEL_ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  const groups = await reservationGroupsRepository.list(getTenantId());
  return ok(groups);
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  try {
    const data = await body<{
      name: string;
      contactPerson?: string;
      contactEmail?: string;
      contactPhone?: string;
      company?: string;
      checkInDate: string;
      checkOutDate: string;
      notes?: string;
      status?: "tentative" | "confirmed" | "cancelled";
    }>(req);
    const created = await reservationGroupsRepository.create(getTenantId(), data);
    return ok(created, 201);
  } catch (e) {
    return err(e instanceof Error ? e.message : "create failed", 400);
  }
}
