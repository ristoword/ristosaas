import { NextRequest } from "next/server";
import { db } from "@/lib/api/store";
import { calcFoodCost } from "@/lib/api/types/kitchen";
import { ok, err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const KITCHEN_ROLES = ["cucina", "supervisor"] as const;

type Ctx = { params: Promise<{ recipeId: string }> };

/** GET /api/kitchen/food-cost/:recipeId — calculate food cost for recipe */
export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...KITCHEN_ROLES]);
  if (guard.error) return guard.error;
  const { recipeId } = await ctx.params;
  const recipe = db.recipes.get(recipeId);
  if (!recipe) return err("Recipe not found", 404);
  return ok(calcFoodCost(recipe));
}
