import { NextRequest } from "next/server";
import { body, err, ok, withErrorHandler} from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { dailyClosureReportsRepository } from "@/lib/db/repositories/daily-closure-reports.repository";

const REPORT_ROLES = ["supervisor", "owner", "cassa", "hotel_manager", "super_admin"] as const;

export const GET = withErrorHandler(async (req) => {
  const guard = await requireApiUser(req, REPORT_ROLES);
  if (guard.error) return guard.error;

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const reports = await dailyClosureReportsRepository.list(getTenantId(), { from, to });
  return ok(reports);
});

export const POST = withErrorHandler(async (req) => {
  const guard = await requireApiUser(req, REPORT_ROLES);
  if (guard.error) return guard.error;

  const payload = await body<{
    date: string;
    foodSpend: number;
    staffSpend: number;
    revenue: number;
    notes?: string;
  }>(req);

  if (!payload.date) return err("date is required");
  const saved = await dailyClosureReportsRepository.upsert(getTenantId(), payload);
  return ok(saved, 201);
});
