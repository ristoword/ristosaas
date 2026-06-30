import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { communityRepository } from "@/lib/db/repositories/community.repository";
import type { CommunityChefProfileInput } from "@/lib/community/types";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const chef = await communityRepository.getChefByUserId(guard.user!.id);
  return ok(chef);
}

export async function PUT(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const data = await body<CommunityChefProfileInput>(req);
  if (!data.displayName?.trim()) return err("Nome richiesto");
  if (!data.restaurantName?.trim()) return err("Ristorante richiesto");

  const tenant = await prisma.tenant.findUnique({ where: { id: getTenantId() }, select: { name: true } });
  await communityRepository.ensureChefProfile(
    guard.user!.id,
    getTenantId(),
    tenant?.name ?? data.restaurantName,
    guard.user!.name,
  );
  const updated = await communityRepository.updateChefProfile(guard.user!.id, data);
  return ok(updated);
}
