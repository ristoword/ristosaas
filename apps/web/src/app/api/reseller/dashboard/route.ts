import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

const RESELLER_ROLES = ["reseller", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, RESELLER_ROLES);
  if (guard.error) return guard.error;
  const { user } = guard;
  if (!user) return err("Unauthorized", 401);

  try {
    const { searchParams } = new URL(req.url);

    let partnerCode: string | null = null;

    if (user.role === "super_admin") {
      partnerCode = searchParams.get("partnerCode");
    } else {
      // reseller: look up their partner record by the userId stored in Partner.userId
      // The reseller user is linked to a Partner via the User.partnerCode field
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { partnerCode: true },
      });
      partnerCode = dbUser?.partnerCode ?? null;
    }

    // Fetch partner metadata
    const partner = partnerCode
      ? await prisma.partner.findUnique({ where: { code: partnerCode } })
      : null;

    // Fetch all licenses for this partner
    const licenses = await prisma.tenantLicense.findMany({
      where: partnerCode ? { partnerCode } : { partnerCode: { not: null } },
      include: {
        tenant: { select: { name: true, id: true } },
        partner: { select: { code: true, name: true, country: true, licensePrice: true, commissionEuros: true } },
      },
      orderBy: { activatedAt: "desc" },
    });

    const rows = licenses.map((l) => ({
      tenantId: l.tenantId,
      tenantName: l.tenant.name,
      plan: l.plan,
      billingCycle: l.billingCycle,
      status: l.status,
      activatedAt: l.activatedAt.toISOString(),
      expiresAt: l.expiresAt.toISOString(),
      licensePrice: l.partner?.licensePrice ?? null,
      commissionEuros: l.partner?.commissionEuros ?? null,
      partnerCode: l.partnerCode,
      partnerName: l.partner?.name ?? null,
      partnerCountry: l.partner?.country ?? null,
    }));

    const totalCommission = rows
      .filter((r) => r.status === "active")
      .reduce((sum, r) => sum + (r.commissionEuros ?? 0), 0);

    return ok({
      partner,
      licenses: rows,
      summary: {
        total: rows.length,
        active: rows.filter((r) => r.status === "active").length,
        expired: rows.filter((r) => r.status === "expired" || r.status === "suspended").length,
        totalCommissionEuros: totalCommission,
      },
    });
  } catch (error) {
    console.error("[reseller/dashboard GET]", error);
    return err("Impossibile caricare i dati.", 500);
  }
}
