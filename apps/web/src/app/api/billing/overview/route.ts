import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { billingRepository } from "@/lib/db/repositories/billing.repository";

const BILLING_ROLES = ["owner", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, BILLING_ROLES);
  if (guard.error) return guard.error;
  return ok(await billingRepository.overview(getTenantId()));
}
