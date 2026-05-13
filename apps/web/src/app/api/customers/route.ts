import { NextRequest } from "next/server";
import { ok, err, body, withErrorHandler} from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { customersRepository } from "@/lib/db/repositories/customers.repository";

const CUSTOMER_ROLES = ["owner", "supervisor", "sala", "cassa", "hotel_manager", "reception", "super_admin"] as const;

export const GET = withErrorHandler(async (req) => {
  const guard = await requireApiUser(req, CUSTOMER_ROLES);
  if (guard.error) return guard.error;
  return ok(await customersRepository.all(getTenantId()));
});
export const POST = withErrorHandler(async (req) => {
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
});
