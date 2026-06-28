import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { actorFromRequest, writeFolioAudit } from "@/lib/hotel/folio-service";
import type { FolioBillingMode } from "@prisma/client";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(_req, ROLES);
  if (guard.error) return guard.error;
  const { id: folioId } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();

  const [assignments, splits, emails, merges] = await Promise.all([
    prisma.folioCompanyAssignment.findMany({
      where: { tenantId, folioId },
      include: { company: true },
    }),
    prisma.folioSplitDefinition.findMany({ where: { tenantId, folioId }, orderBy: { sortOrder: "asc" } }),
    prisma.folioEmailLog.findMany({ where: { tenantId, folioId }, orderBy: { sentAt: "desc" }, take: 20 }),
    prisma.folioMergeLog.findMany({
      where: { tenantId, OR: [{ targetFolioId: folioId }, { sourceFolioId: folioId }] },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return ok({
    assignments: assignments.map((a) => ({
      id: a.id,
      companyId: a.companyId,
      companyName: a.company.name,
      splitCode: a.splitCode,
      billingMode: a.billingMode,
      amountLimit: a.amountLimit?.toNumber() ?? null,
      costCenter: a.costCenter ?? a.company.costCenter,
      vatNumber: a.company.vatNumber,
      creditLimit: a.company.creditLimit.toNumber(),
      outstandingBalance: a.company.outstandingBalance.toNumber(),
      deferredBilling: a.company.deferredBilling,
    })),
    splits,
    emailLogs: emails,
    mergeLogs: merges,
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id: folioId } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{
    companyId: string;
    billingMode?: FolioBillingMode;
    splitCode?: string;
    amountLimit?: number;
    costCenter?: string;
  }>(req);

  if (!payload.companyId) return err("companyId required", 400);

  const company = await prisma.folioCompanyAccount.findFirst({
    where: { id: payload.companyId, tenantId, active: true },
  });
  if (!company) return err("Azienda non trovata", 404);

  if (payload.amountLimit != null && company.creditLimit.toNumber() > 0) {
    const projected = company.outstandingBalance.toNumber() + payload.amountLimit;
    if (projected > company.creditLimit.toNumber()) {
      return err("Limite di credito aziendale superato", 400);
    }
  }

  const assignment = await prisma.folioCompanyAssignment.create({
    data: {
      tenantId,
      folioId,
      companyId: payload.companyId,
      billingMode: payload.billingMode ?? "mixed",
      splitCode: payload.splitCode ?? "COMPANY",
      amountLimit: payload.amountLimit ?? null,
      costCenter: payload.costCenter ?? company.costCenter,
    },
    include: { company: true },
  });

  await writeFolioAudit({
    tenantId,
    folioId,
    action: "company_assigned",
    newValue: company.name,
    actor: actorFromRequest(guard.user, req.headers),
  });

  return ok({ assignment }, 201);
}
