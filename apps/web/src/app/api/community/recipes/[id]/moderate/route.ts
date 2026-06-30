import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { communityRepository } from "@/lib/db/repositories/community.repository";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ["super_admin"]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const data = await body<{ moderated: boolean; featured?: boolean }>(req);
  const recipe = await communityRepository.moderateRecipe(id, data.moderated);
  if (!recipe) return err("Ricetta non trovata", 404);
  return ok(recipe);
}
