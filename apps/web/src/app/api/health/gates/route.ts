import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { isMaintenanceMode } from "@/lib/db/repositories/platform.repository";

export const dynamic = "force-dynamic";

/** Public read for edge middleware: maintenance + optional tenant block (by tenantId). */
export async function GET(req: NextRequest) {
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
}
