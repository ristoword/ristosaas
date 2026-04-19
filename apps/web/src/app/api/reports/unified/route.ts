import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { unifiedReportsRepository } from "@/lib/db/repositories/unified-reports.repository";

const REPORT_ROLES = ["supervisor", "owner", "cassa", "hotel_manager", "super_admin", "reception"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, REPORT_ROLES);
  if (guard.error) return guard.error;

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const snapshot = await unifiedReportsRepository.snapshot(getTenantId(), { from, to });
  return ok(snapshot);
}
