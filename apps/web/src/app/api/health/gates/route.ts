import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { isMaintenanceMode } from "@/lib/db/repositories/platform.repository";

import { withErrorHandler } from "@/lib/api/helpers";
export const dynamic = "force-dynamic";

/**
 * Internal-only read for edge middleware: maintenance + optional tenant block.
 * Rejects external callers by checking for an internal middleware header.
 */
export const GET = withErrorHandler(async (req) => {
  const isInternal =
    req.headers.get("x-middleware-internal") === "1" ||
    req.headers.get("sec-fetch-site") === "same-origin";
  if (!isInternal) {
    return NextResponse.json({ maintenanceMode: false, tenantBlocked: false });
  }

  const tenantId = req.nextUrl.searchParams.get("tenantId");
  const maintenanceMode = await isMaintenanceMode();
  let tenantBlocked = false;
  if (tenantId && tenantId.length > 0 && tenantId.length < 200) {
    const row = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { accessStatus: true },
    });
    tenantBlocked = row?.accessStatus === "blocked";
  }
  return NextResponse.json({ maintenanceMode, tenantBlocked });
});
