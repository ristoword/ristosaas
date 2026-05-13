import { NextRequest } from "next/server";
import { ok, err, withErrorHandler} from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { kitchenMenuRepository } from "@/lib/db/repositories/kitchen-menu.repository";

const KITCHEN_ROLES = ["cucina", "supervisor", "owner", "super_admin"] as const;

type Ctx = { params: Promise<{ recipeId: string }> };

/** GET /api/kitchen/food-cost/:recipeId — calculate food cost for recipe */
export const GET = withErrorHandler(async (req, ctx) => {
  const guard = await requireApiUser(req, [...KITCHEN_ROLES]);
  if (guard.error) return guard.error;
  const { recipeId } = await ctx.params;
  const tenantId = getTenantId();
  const recipe = await kitchenMenuRepository.getRecipe(tenantId, recipeId);
  if (!recipe) return err("Recipe not found", 404);
  return ok(await kitchenMenuRepository.calcRecipeFoodCostRealtime(tenantId, recipe));
});
