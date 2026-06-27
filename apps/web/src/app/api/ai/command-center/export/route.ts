import { NextRequest, NextResponse } from "next/server";
import { err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import {
  buildCommandCenterCsv,
  buildCommandCenterDashboard,
  buildCommandCenterPdfBuffer,
} from "@/lib/ai/command-center/dashboard-service";
import type { CommandCenterFilters } from "@/lib/ai/command-center/types";

const ROLES = ["owner", "supervisor", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();

  const sp = req.nextUrl.searchParams;
  const format = (sp.get("format") || "csv").toLowerCase();
  const filters: CommandCenterFilters = {
    module: sp.get("module")?.trim() || undefined,
    periodDays: Number(sp.get("periodDays") || "30"),
  };

  const dashboard = await buildCommandCenterDashboard(tenantId, filters);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "pdf") {
    const buffer = await buildCommandCenterPdfBuffer(dashboard);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ai-command-center-${stamp}.pdf"`,
      },
    });
  }

  if (format === "csv") {
    const csv = buildCommandCenterCsv(dashboard);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ai-command-center-${stamp}.csv"`,
      },
    });
  }

  return err("format must be csv or pdf", 400);
}
