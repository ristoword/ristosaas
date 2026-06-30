import { NextRequest } from "next/server";
import { ok, err, body, fireAndForget } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { communityRepository } from "@/lib/db/repositories/community.repository";
import { COMMUNITY_PUBLISH_ROLES } from "@/lib/community/constants";
import type { CommunityRecipeInput } from "@/lib/community/types";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...COMMUNITY_PUBLISH_ROLES]);
  if (guard.error) return guard.error;
  const data = await body<CommunityRecipeInput>(req);
  if (!data.title?.trim()) return err("Titolo richiesto");
  if (!data.category) return err("Categoria richiesta");

  const tenant = await prisma.tenant.findUnique({ where: { id: getTenantId() }, select: { name: true } });
  const chef = await communityRepository.ensureChefProfile(
    guard.user!.id,
    getTenantId(),
    tenant?.name ?? "Ristorante",
    guard.user!.name,
  );

  const recipe = await communityRepository.createRecipe(
    chef.id,
    guard.user!.id,
    getTenantId(),
    data,
  );
  return ok(recipe, 201);
}
