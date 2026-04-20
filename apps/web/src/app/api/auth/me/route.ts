import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { getRequestUser } from "@/lib/auth/session";
import { authUsersRepository } from "@/lib/db/repositories/auth-users.repository";
import { isMaintenanceMode, isTenantBlocked } from "@/lib/db/repositories/platform.repository";
import { prisma } from "@/lib/db/prisma";
import type { LicenseStatus, TenantProfile } from "@/lib/auth/types";

export async function GET(req: NextRequest) {
  const user = getRequestUser(req);
  if (!user) return err("User not found", 401);
  const validSession = await authUsersRepository.isSessionVersionValid(user.id, user.sessionVersion ?? 0);
  if (!validSession) return err("Session expired. Please login again.", 401);

  if (user.role !== "super_admin") {
    if (await isMaintenanceMode()) return err("Piattaforma in manutenzione. Riprova più tardi.", 503);
    if (await isTenantBlocked(user.tenantId)) return err("Struttura sospesa. Contatta l'assistenza.", 403);
  }

  let tenantProfile: TenantProfile | null = null;
  if (user.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      include: {
        features: true,
        license: true,
      },
    });
    if (tenant) {
      tenantProfile = {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan as TenantProfile["plan"],
        accessStatus: tenant.accessStatus as TenantProfile["accessStatus"],
        features: tenant.features.filter((f) => f.enabled).map((f) => f.code),
        license: tenant.license
          ? {
              status: tenant.license.status as LicenseStatus,
              plan: tenant.license.plan as TenantProfile["plan"],
              billingCycle: tenant.license.billingCycle,
              seats: tenant.license.seats,
              usedSeats: tenant.license.usedSeats,
              expiresAt: tenant.license.expiresAt ? tenant.license.expiresAt.toISOString() : null,
            }
          : null,
      };
    }
  }

  return ok({ ...user, tenant: tenantProfile });
}
