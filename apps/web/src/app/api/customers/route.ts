import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { customersRepository } from "@/lib/db/repositories/customers.repository";

const CUSTOMER_ROLES = ["owner", "supervisor", "sala", "cassa", "hotel_manager", "reception", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, CUSTOMER_ROLES);
  if (guard.error) return guard.error;
  return ok(await customersRepository.all(getTenantId()));
}
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, CUSTOMER_ROLES);
  if (guard.error) return guard.error;
  const data = await body<{
    name: string;
    email: string;
    phone: string;
    type: "vip" | "habitue" | "walk-in" | "new";
    visits: number;
    totalSpent: number;
    avgSpend: number;
    allergies: string;
    preferences: string;
    notes: string;
    lastVisit: string;
  }>(req);
  if (!data.name?.trim()) return err("name required");
  const item = await customersRepository.create(getTenantId(), data);
  return ok(item, 201);
}
