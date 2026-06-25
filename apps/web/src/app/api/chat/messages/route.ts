import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const ALL_ROLES = [
  "sala", "cucina", "bar", "pizzeria", "cassa", "magazzino",
  "staff", "supervisor", "owner", "super_admin",
  "hotel_manager", "reception", "housekeeping",
] as const;

const PAGE_SIZE = 80;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ALL_ROLES);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const cursor = req.nextUrl.searchParams.get("cursor");
  const pinned = req.nextUrl.searchParams.get("pinned");

  if (pinned === "true") {
    const messages = await prisma.chatMessage.findMany({
      where: { tenantId, pinned: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return ok(messages);
  }

  const messages = await prisma.chatMessage.findMany({
    where: {
      tenantId,
      ...(cursor ? { createdAt: { gt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: PAGE_SIZE,
  });

  return ok(messages);
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ALL_ROLES);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const data = await body<{ body: string; replyToId?: string }>(req);
  if (!data.body?.trim()) return err("body required");

  const msg = await prisma.chatMessage.create({
    data: {
      tenantId,
      userId: guard.user.id,
      userName: guard.user.name || guard.user.username,
      userRole: guard.user.role,
      body: data.body.trim(),
      replyToId: data.replyToId || null,
    },
  });

  return ok(msg, 201);
}
