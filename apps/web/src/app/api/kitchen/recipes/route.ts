import { NextRequest } from "next/server";
import type { Recipe } from "@/lib/api/types/kitchen";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { kitchenMenuRepository } from "@/lib/db/repositories/kitchen-menu.repository";

const KITCHEN_ROLES = ["cucina", "supervisor", "owner", "super_admin"] as const;

/** GET /api/kitchen/recipes — list all recipes */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...KITCHEN_ROLES]);
  if (guard.error) return guard.error;
  return ok(await kitchenMenuRepository.allRecipes(getTenantId()));
}

/** POST /api/kitchen/recipes — create recipe + auto food-cost */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...KITCHEN_ROLES]);
  if (guard.error) return guard.error;
  const data = await body<Omit<Recipe, "id" | "createdAt">>(req);
  if (!data.name?.trim()) return err("name is required");
  const recipe = await kitchenMenuRepository.createRecipe(getTenantId(), data);
  const foodCost = kitchenMenuRepository.calcRecipeFoodCost(recipe);

  return ok({ recipe, foodCost }, 201);
}
