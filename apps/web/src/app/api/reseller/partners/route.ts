import { NextRequest } from "next/server";
import { err, ok, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

const ADMIN_ROLES = ["super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;

  const partners = await prisma.partner.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { licenses: true } } },
  });

  return ok(partners);
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;

  const data = await body<{
    code: string;
    name: string;
    country: string;
    email?: string;
    phone?: string;
    notes?: string;
    commissionType: "fixed" | "percent";
    licensePrice: number;
    commissionEuros: number;
    commissionPct: number;
    allInclusivePrice?: number | null;
    allInclusiveCommission?: number | null;
    allInclusivePct?: number | null;
  }>(req);

  if (!data.code?.trim()) return err("Codice partner obbligatorio");
  if (!data.name?.trim()) return err("Nome partner obbligatorio");
  if (!data.country?.trim()) return err("Paese obbligatorio");

  const existing = await prisma.partner.findUnique({ where: { code: data.code.trim().toLowerCase() } });
  if (existing) return err(`Partner con codice "${data.code}" esiste già`);

  const partner = await prisma.partner.create({
    data: {
      code: data.code.trim().toLowerCase(),
      name: data.name.trim(),
      country: data.country.trim(),
      email: data.email?.trim() || "",
      phone: data.phone?.trim() || "",
      notes: data.notes?.trim() || "",
      commissionType: data.commissionType || "fixed",
      licensePrice: data.licensePrice || 0,
      commissionEuros: data.commissionEuros || 0,
      commissionPct: data.commissionPct || 0,
      allInclusivePrice: data.allInclusivePrice ?? null,
      allInclusiveCommission: data.allInclusiveCommission ?? null,
      allInclusivePct: data.allInclusivePct ?? null,
      active: true,
    },
  });

  return ok(partner);
}

export async function PUT(req: NextRequest) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;

  const data = await body<{
    id: string;
    name?: string;
    country?: string;
    email?: string;
    phone?: string;
    notes?: string;
    commissionType?: "fixed" | "percent";
    licensePrice?: number;
    commissionEuros?: number;
    commissionPct?: number;
    allInclusivePrice?: number | null;
    allInclusiveCommission?: number | null;
    allInclusivePct?: number | null;
    active?: boolean;
  }>(req);

  if (!data.id) return err("ID partner obbligatorio");

  const partner = await prisma.partner.update({
    where: { id: data.id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.country !== undefined && { country: data.country.trim() }),
      ...(data.email !== undefined && { email: data.email.trim() }),
      ...(data.phone !== undefined && { phone: data.phone.trim() }),
      ...(data.notes !== undefined && { notes: data.notes.trim() }),
      ...(data.commissionType !== undefined && { commissionType: data.commissionType }),
      ...(data.licensePrice !== undefined && { licensePrice: data.licensePrice }),
      ...(data.commissionEuros !== undefined && { commissionEuros: data.commissionEuros }),
      ...(data.commissionPct !== undefined && { commissionPct: data.commissionPct }),
      ...(data.allInclusivePrice !== undefined && { allInclusivePrice: data.allInclusivePrice }),
      ...(data.allInclusiveCommission !== undefined && { allInclusiveCommission: data.allInclusiveCommission }),
      ...(data.allInclusivePct !== undefined && { allInclusivePct: data.allInclusivePct }),
      ...(data.active !== undefined && { active: data.active }),
    },
  });

  return ok(partner);
}

export async function DELETE(req: NextRequest) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return err("ID partner obbligatorio");

  const partner = await prisma.partner.findUnique({
    where: { id },
    include: { _count: { select: { licenses: true } } },
  });

  if (!partner) return err("Partner non trovato");

  if (partner._count.licenses > 0) {
    await prisma.partner.update({ where: { id }, data: { active: false } });
    return ok({ deactivated: true, message: "Partner disattivato (ha licenze collegate)." });
  }

  await prisma.partner.delete({ where: { id } });
  return ok({ deleted: true });
}
