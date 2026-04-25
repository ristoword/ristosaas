import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const ROLES = ["owner", "super_admin"] as const;
type Ctx = { params: Promise<{ slug: string }> };

/** PUT /api/email-templates/:slug — salva/aggiorna template */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...ROLES]);
  if (guard.error) return guard.error;

  const { slug } = await ctx.params;
  const tenantId = getTenantId();
  const data = await body<{ subject: string; body: string; variables?: string }>(req);

  if (!data.subject?.trim()) return err("subject obbligatorio", 400);
  if (!data.body?.trim()) return err("body obbligatorio", 400);

  const template = await prisma.emailTemplate.upsert({
    where: { tenantId_slug: { tenantId, slug } },
    create: { tenantId, slug, subject: data.subject.trim(), body: data.body.trim(), variables: data.variables ?? "" },
    update: { subject: data.subject.trim(), body: data.body.trim(), variables: data.variables ?? "" },
    select: { slug: true, subject: true, body: true, variables: true, updatedAt: true },
  });

  return ok({ ...template, updatedAt: template.updatedAt.toISOString() });
}

/** DELETE /api/email-templates/:slug — ripristina default */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...ROLES]);
  if (guard.error) return guard.error;

  const { slug } = await ctx.params;
  const tenantId = getTenantId();

  await prisma.emailTemplate.deleteMany({ where: { tenantId, slug } });
  return ok({ reset: true });
}
