import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { communityRepository } from "@/lib/db/repositories/community.repository";
import { COMMUNITY_PUBLISH_ROLES } from "@/lib/community/constants";
import type { CommunityRecipeInput } from "@/lib/community/types";
import { prisma } from "@/lib/db/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const locale = new URL(req.url).searchParams.get("locale");
  const recipe = await communityRepository.getRecipe(id, guard.user!.id, true);
  if (!recipe) return err("Ricetta non trovata", 404);

  if (locale) {
    const translation = await communityRepository.getTranslation(id, locale);
    if (translation) {
      return ok({
        ...recipe,
        title: translation.title,
        description: translation.description,
        chefTips: translation.chefTips,
        techniques: translation.techniques,
        plating: translation.plating,
        variants: translation.variants,
        steps: JSON.parse(translation.stepsJson || "[]"),
        translated: true,
      });
    }
  }
  return ok(recipe);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...COMMUNITY_PUBLISH_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const data = await body<Partial<CommunityRecipeInput>>(req);
  const updated = await communityRepository.updateRecipe(
    id,
    guard.user!.id,
    guard.user!.role === "super_admin",
    data,
  );
  return updated ? ok(updated) : err("Non autorizzato o ricetta non trovata", 403);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const existing = await prisma.communityRecipe.findUnique({ where: { id } });
  if (!existing) return err("Ricetta non trovata", 404);
  if (existing.authorUserId !== guard.user!.id && guard.user!.role !== "super_admin") {
    return err("Non autorizzato", 403);
  }
  await prisma.communityRecipe.delete({ where: { id } });
  await prisma.communityChefProfile.update({
    where: { id: existing.chefId },
    data: { recipeCount: { decrement: 1 } },
  });
  return ok({ deleted: true });
}
