import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { communityRepository } from "@/lib/db/repositories/community.repository";
import { translateCommunityRecipe } from "@/lib/community/ai";
import { COMMUNITY_TRANSLATION_LOCALES } from "@/lib/community/constants";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const locale = new URL(req.url).searchParams.get("locale") ?? "en";
  if (!COMMUNITY_TRANSLATION_LOCALES.includes(locale as (typeof COMMUNITY_TRANSLATION_LOCALES)[number])) {
    return err("Lingua non supportata");
  }

  const cached = await communityRepository.getTranslation(id, locale);
  if (cached) {
    return ok({
      title: cached.title,
      description: cached.description,
      chefTips: cached.chefTips,
      techniques: cached.techniques,
      plating: cached.plating,
      variants: cached.variants,
      steps: JSON.parse(cached.stepsJson || "[]"),
      cached: true,
    });
  }

  const recipe = await communityRepository.getRecipe(id, guard.user!.id, false);
  if (!recipe) return err("Ricetta non trovata", 404);

  const translated = await translateCommunityRecipe(recipe, locale);
  if (!translated) return err("Traduzione non disponibile (AI non configurata)", 503);

  await communityRepository.applyTranslation(id, locale, translated);
  return ok({
    ...translated,
    steps: JSON.parse(translated.stepsJson),
    cached: false,
  });
}
