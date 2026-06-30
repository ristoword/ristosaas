import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { improveCommunityRecipeWithAi } from "@/lib/community/ai";
import type { CommunityRecipeDetail } from "@/lib/community/types";
import { COMMUNITY_PUBLISH_ROLES } from "@/lib/community/constants";

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...COMMUNITY_PUBLISH_ROLES]);
  if (guard.error) return guard.error;
  const data = await body<{ recipe: Partial<CommunityRecipeDetail>; focus?: string }>(req);
  const improved = await improveCommunityRecipeWithAi(data.recipe, data.focus);
  if (!improved) return err("AI non disponibile", 503);
  return ok(improved);
}
