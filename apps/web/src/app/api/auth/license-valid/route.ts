import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { getRequestUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type LicenseStatus = "trial" | "active" | "expired" | "suspended";

const VALID_LICENSE_STATUSES: LicenseStatus[] = ["trial", "active"];

export async function GET(req: NextRequest) {
  const user = getRequestUser(req);
  if (!user) return err("Unauthorized", 401);

  // Super admin can always access to recover billing/license issues.
  if (user.role === "super_admin") return ok({ valid: true, status: "active" as LicenseStatus, bypass: true });

  if (!user.tenantId) return err("Tenant context missing", 400);
  const tenantId = user.tenantId;
  const license = await prisma.tenantLicense.findUnique({
    where: { tenantId },
    select: { status: true },
  });

  if (!license) return err("License not found", 402);
  if (!VALID_LICENSE_STATUSES.includes(license.status as LicenseStatus)) {
    return err("License inactive", 402);
  }

  return ok({ valid: true, status: license.status as LicenseStatus, bypass: false });
}
