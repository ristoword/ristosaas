import { NextRequest } from "next/server";
import { db, uid } from "@/lib/api/store";
import { calcFoodCost } from "@/lib/api/types/kitchen";
import type { MenuItem } from "@/lib/api/types/kitchen";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const MENU_ROLES = ["cucina", "sala", "cassa", "supervisor"] as const;

/** GET /api/menu/items */
export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, [...MENU_ROLES]);
  if (guard.error) return guard.error;
  return ok(db.menuItems.all());
}

/** POST /api/menu/items — add menu item (optionally from recipe) */
export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, [...MENU_ROLES]);
  if (guard.error) return guard.error;
  const data = await body<Omit<MenuItem, "id"> & { fromRecipeId?: string }>(req);

  if (data.fromRecipeId) {
    const recipe = db.recipes.get(data.fromRecipeId);
    if (!recipe) return err("Recipe not found", 404);
    const fc = calcFoodCost(recipe);
    const id = uid("mi");
    const item: MenuItem = {
      id,
      name: recipe.name,
      category: recipe.category,
      area: recipe.area.charAt(0).toUpperCase() + recipe.area.slice(1),
      price: recipe.sellingPrice,
      code: data.code || "",
      active: true,
      recipeId: recipe.id,
      notes: data.notes || "",
      foodCostPct: Math.round(fc.fcPct * 10) / 10,
    };
    db.menuItems.set(id, item);
    return ok(item, 201);
  }

  if (!data.name?.trim()) return err("name is required");
  const id = uid("mi");
  const item: MenuItem = { ...data, id, fromRecipeId: undefined } as MenuItem;
  db.menuItems.set(id, item);
  return ok(item, 201);
}
