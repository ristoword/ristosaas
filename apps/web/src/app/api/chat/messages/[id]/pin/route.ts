import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const MANAGER_ROLES = ["supervisor", "owner", "super_admin"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiUser(req, MANAGER_ROLES);
  if (guard.error) return guard.error;

  const { id } = await params;
  const tenantId = getTenantId();

  const msg = await prisma.chatMessage.findFirst({ where: { id, tenantId } });
  if (!msg) return err("not found", 404);

  const updated = await prisma.chatMessage.update({
    where: { id },
    data: { pinned: !msg.pinned },
  });

  return ok(updated);
}
