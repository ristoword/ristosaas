import { NextRequest } from "next/server";
import { ok, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const ALL_ROLES = [
  "sala", "cucina", "bar", "pizzeria", "cassa", "magazzino",
  "staff", "supervisor", "owner", "super_admin",
  "hotel_manager", "reception", "housekeeping",
] as const;

/** GET /api/notifications?unread=1&limit=30 */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...ALL_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const userId = guard.user.id;
  const p = req.nextUrl.searchParams;
  const unreadOnly = p.get("unread") === "1";
  const limit = Math.min(Number(p.get("limit") ?? "30"), 100);

  const where = {
    tenantId,
    OR: [{ userId }, { userId: null }],
    ...(unreadOnly ? { read: false } : {}),
  };

  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, type: true, title: true, message: true, href: true, read: true, createdAt: true },
    }),
    prisma.notification.count({ where: { tenantId, OR: [{ userId }, { userId: null }], read: false } }),
  ]);

  return ok({
    items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    unreadCount,
  });
}

/** POST /api/notifications — internal use (called from other API routes) */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...ALL_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const data = await body<{ type?: string; title: string; message?: string; href?: string; userId?: string | null }>(req);

  const row = await prisma.notification.create({
    data: {
      tenantId,
      userId: data.userId ?? null,
      type: data.type ?? "sistema",
      title: data.title,
      message: data.message ?? "",
      href: data.href ?? "",
    },
    select: { id: true, type: true, title: true, message: true, href: true, read: true, createdAt: true },
  });

  return ok({ ...row, createdAt: row.createdAt.toISOString() }, 201);
}
