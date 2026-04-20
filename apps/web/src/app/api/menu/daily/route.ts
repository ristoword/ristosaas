import { NextRequest } from "next/server";
import type { DailyDish } from "@/lib/api/types/kitchen";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { kitchenMenuRepository } from "@/lib/db/repositories/kitchen-menu.repository";

const MENU_ROLES = ["cucina", "sala", "cassa", "supervisor", "owner", "super_admin"] as const;

/** GET /api/menu/daily */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...MENU_ROLES]);
  if (guard.error) return guard.error;
  return ok(await kitchenMenuRepository.allDailyDishes(getTenantId()));
}

/** POST /api/menu/daily — add daily dish (optionally from recipe) */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...MENU_ROLES]);
  if (guard.error) return guard.error;
  const data = await body<Omit<DailyDish, "id"> & { fromRecipeId?: string }>(req);
  const tenantId = getTenantId();

  if (data.fromRecipeId) {
    const recipe = await kitchenMenuRepository.getRecipe(tenantId, data.fromRecipeId);
    if (!recipe) return err("Recipe not found", 404);
    const dish = await kitchenMenuRepository.createDailyDish(tenantId, {
      name: recipe.name,
      description: data.description || "",
      category: recipe.category,
      price: recipe.sellingPrice,
      allergens: data.allergens || "",
      recipeId: recipe.id,
    });
    return ok(dish, 201);
  }

  if (!data.name?.trim()) return err("name is required");
  const dish = await kitchenMenuRepository.createDailyDish(tenantId, {
    name: data.name,
    description: data.description,
    category: data.category,
    price: data.price,
    allergens: data.allergens,
    recipeId: data.recipeId,
  });
  return ok(dish, 201);
}
