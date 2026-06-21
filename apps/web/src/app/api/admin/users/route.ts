import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { authUsersRepository } from "@/lib/db/repositories/auth-users.repository";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { recordAdminAudit } from "@/lib/observability/admin-audit";

const ADMIN_ROLES = ["super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;
  const limit = Number(req.nextUrl.searchParams.get("limit") || 200);
  const offset = Number(req.nextUrl.searchParams.get("offset") || 0);
  const tenantId = req.nextUrl.searchParams.get("tenantId") || undefined;
  return ok(
    await authUsersRepository.listUsers({
      tenantId,
      limit: Number.isFinite(limit) ? limit : 200,
      offset: Number.isFinite(offset) ? offset : 0,
    }),
  );
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;

  const data = await body<{
    username: string;
    name: string;
    email: string;
    password: string;
    role: string;
    tenantId?: string;
    partnerCode?: string;
  }>(req);

  if (!data.username?.trim()) return err("Username obbligatorio");
  if (!data.name?.trim()) return err("Nome obbligatorio");
  if (!data.email?.trim()) return err("Email obbligatoria");
  if (!data.password || data.password.length < 6) return err("Password min 6 caratteri");
  if (!data.role?.trim()) return err("Ruolo obbligatorio");

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username: data.username.trim() }, { email: data.email.trim() }] },
  });
  if (existing) return err("Username o email già in uso");

  let tenantId = data.tenantId?.trim();
  if (!tenantId) {
    const demo = await prisma.tenant.findFirst({ where: { slug: "demo" } });
    tenantId = demo?.id ?? "tenant_demo";
  }

  const user = await prisma.user.create({
    data: {
      tenantId,
      username: data.username.trim().toLowerCase(),
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      passwordHash: hashPassword(data.password),
      role: data.role.trim(),
      mustChangePassword: true,
      partnerCode: data.partnerCode?.trim() || null,
    },
    select: {
      id: true, tenantId: true, username: true, passwordHash: true,
      name: true, role: true, email: true, partnerCode: true,
      sessionVersion: true, mustChangePassword: true,
      failedLoginAttempts: true, lockedUntil: true,
    },
  });

  void recordAdminAudit({
    action: "user.create",
    actor: guard.user,
    targetId: user.id,
    metadata: { username: user.username, role: user.role, email: user.email },
    req,
  });

  return ok({ user: authUsersRepository.sanitizeUser(user), password: data.password });
}
