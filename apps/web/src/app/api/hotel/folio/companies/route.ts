import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;

function mapCompany(row: {
  id: string;
  name: string;
  vatNumber: string | null;
  taxCode: string | null;
  costCenter: string | null;
  creditLimit: { toNumber: () => number };
  outstandingBalance: { toNumber: () => number };
  deferredBilling: boolean;
  contractRef: string | null;
  active: boolean;
}) {
  return {
    id: row.id,
    name: row.name,
    vatNumber: row.vatNumber,
    taxCode: row.taxCode,
    costCenter: row.costCenter,
    creditLimit: row.creditLimit.toNumber(),
    outstandingBalance: row.outstandingBalance.toNumber(),
    deferredBilling: row.deferredBilling,
    contractRef: row.contractRef,
    active: row.active,
  };
}

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const rows = await prisma.folioCompanyAccount.findMany({
    where: { tenantId, active: true },
    orderBy: { name: "asc" },
  });
  return ok({ companies: rows.map(mapCompany) });
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{
    name: string;
    vatNumber?: string;
    taxCode?: string;
    costCenter?: string;
    creditLimit?: number;
    deferredBilling?: boolean;
    contractRef?: string;
  }>(req);
  if (!payload.name?.trim()) return err("name required", 400);
  const row = await prisma.folioCompanyAccount.create({
    data: {
      tenantId,
      name: payload.name.trim(),
      vatNumber: payload.vatNumber ?? null,
      taxCode: payload.taxCode ?? null,
      costCenter: payload.costCenter ?? null,
      creditLimit: payload.creditLimit ?? 0,
      deferredBilling: payload.deferredBilling ?? false,
      contractRef: payload.contractRef ?? null,
    },
  });
  return ok({ company: mapCompany(row) }, 201);
}
