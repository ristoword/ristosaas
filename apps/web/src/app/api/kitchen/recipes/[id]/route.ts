import { NextRequest } from "next/server";
import type { Recipe } from "@/lib/api/types/kitchen";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { kitchenMenuRepository } from "@/lib/db/repositories/kitchen-menu.repository";

const KITCHEN_ROLES = ["cucina", "supervisor"] as const;

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/kitchen/recipes/:id — single recipe + food cost */
export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...KITCHEN_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const recipe = await kitchenMenuRepository.getRecipe(getTenantId(), id);
  if (!recipe) return err("Recipe not found", 404);
  return ok({ recipe, foodCost: kitchenMenuRepository.calcRecipeFoodCost(recipe) });
}

/** PUT /api/kitchen/recipes/:id — update recipe, recalculate food cost */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...KITCHEN_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const updates = await body<Partial<Recipe>>(req);
  const updated = await kitchenMenuRepository.updateRecipe(getTenantId(), id, updates);
  if (!updated) return err("Recipe not found", 404);
  return ok({ recipe: updated, foodCost: kitchenMenuRepository.calcRecipeFoodCost(updated) });
}

/** DELETE /api/kitchen/recipes/:id */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...KITCHEN_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const deleted = await kitchenMenuRepository.deleteRecipe(getTenantId(), id);
  if (!deleted) return err("Recipe not found", 404);
  return ok({ deleted: true });
}
