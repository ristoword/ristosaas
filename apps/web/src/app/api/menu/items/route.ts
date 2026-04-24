import { NextRequest } from "next/server";
import type { MenuItem } from "@/lib/api/types/kitchen";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { kitchenMenuRepository } from "@/lib/db/repositories/kitchen-menu.repository";

const MENU_ROLES = ["cucina", "sala", "cassa", "supervisor", "owner", "super_admin"] as const;

/** GET /api/menu/items */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...MENU_ROLES]);
  if (guard.error) return guard.error;
  return ok(await kitchenMenuRepository.allMenuItems(getTenantId()));
}

/** POST /api/menu/items — add menu item (optionally from recipe) */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...MENU_ROLES]);
  if (guard.error) return guard.error;
  const data = await body<Omit<MenuItem, "id"> & { fromRecipeId?: string }>(req);
  const tenantId = getTenantId();

  if (data.fromRecipeId) {
    const recipe = await kitchenMenuRepository.getRecipe(tenantId, data.fromRecipeId);
    if (!recipe) return err("Recipe not found", 404);
    const fc = await kitchenMenuRepository.calcRecipeFoodCostRealtime(tenantId, recipe);
    const item = await kitchenMenuRepository.createMenuItem(tenantId, {
      name: recipe.name,
      category: recipe.category,
      area: recipe.area.toLowerCase(),
      price: recipe.sellingPrice,
      code: data.code || "",
      active: true,
      recipeId: recipe.id,
      notes: data.notes || "",
      foodCostPct: Math.round(fc.fcPct * 10) / 10,
    });
    return ok(item, 201);
  }

  if (!data.name?.trim()) return err("name is required");
  let foodCostPct = data.foodCostPct;
  if (data.recipeId) {
    const recipe = await kitchenMenuRepository.getRecipe(tenantId, data.recipeId);
    if (recipe) {
      const fc = await kitchenMenuRepository.calcRecipeFoodCostRealtime(tenantId, recipe);
      foodCostPct = Math.round(fc.fcPct * 10) / 10;
    }
  }
  const item = await kitchenMenuRepository.createMenuItem(tenantId, {
    name: data.name,
    category: data.category,
    area: data.area,
    price: data.price,
    code: data.code,
    active: data.active,
    recipeId: data.recipeId,
    notes: data.notes,
    foodCostPct,
  });
  return ok(item, 201);
}
