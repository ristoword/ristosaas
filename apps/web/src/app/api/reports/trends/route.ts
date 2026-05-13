import { NextRequest } from "next/server";
import { ok, withErrorHandler} from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { reportTrendsRepository } from "@/lib/db/repositories/report-trends.repository";

const REPORT_ROLES = ["supervisor", "owner", "cassa", "hotel_manager", "super_admin", "reception"] as const;

export const GET = withErrorHandler(async (req) => {
  const guard = await requireApiUser(req, REPORT_ROLES);
  if (guard.error) return guard.error;

  const snapshot = await reportTrendsRepository.snapshot(getTenantId());
  return ok(snapshot);
});
