import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { parseStaffCostCountry, staffCostCountryFromTenant } from "@/lib/staff/staff-cost-country";

const OWNER_ROLES = ["owner", "super_admin"] as const;

function mapTenant(row: { id: string; name: string; slug: string; country: string }) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    country: staffCostCountryFromTenant(row),
  };
}

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, OWNER_ROLES);
  if (guard.error) return guard.error;
  if (!guard.user.tenantId) return err("Tenant context missing", 400);

  const tenant = await prisma.tenant.findUnique({
    where: { id: guard.user.tenantId },
    select: { id: true, name: true, slug: true, country: true },
  });
  if (!tenant) return err("Tenant not found", 404);
  return ok(mapTenant(tenant));
}

export async function PATCH(req: NextRequest) {
  const guard = await requireApiUser(req, OWNER_ROLES);
  if (guard.error) return guard.error;
  if (!guard.user.tenantId) return err("Tenant context missing", 400);

  const payload = await body<{ country?: unknown }>(req);
  const country = parseStaffCostCountry(payload?.country);
  if (!country) return err("country must be IT or NL");

  const tenant = await prisma.tenant.update({
    where: { id: guard.user.tenantId },
    data: { country },
    select: { id: true, name: true, slug: true, country: true },
  });
  return ok(mapTenant(tenant));
}
