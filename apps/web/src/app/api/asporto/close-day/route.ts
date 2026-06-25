import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { operationsRepository } from "@/lib/db/repositories/operations.repository";

const CLOSE_DAY_ROLES = ["owner", "supervisor", "cassa", "super_admin"] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, CLOSE_DAY_ROLES);
  if (guard.error) return guard.error;
  const summary = await operationsRepository.asporto.closeDay(getTenantId());
  return ok(summary);
}
