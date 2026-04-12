import { NextRequest } from "next/server";
import { db, uid } from "@/lib/api/store";
import type { DailyDish } from "@/lib/api/types/kitchen";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const MENU_ROLES = ["cucina", "sala", "cassa", "supervisor"] as const;

/** GET /api/menu/daily */
export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, [...MENU_ROLES]);
  if (guard.error) return guard.error;
  return ok(db.dailyDishes.all());
}

/** POST /api/menu/daily — add daily dish (optionally from recipe) */
export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, [...MENU_ROLES]);
  if (guard.error) return guard.error;
  const data = await body<Omit<DailyDish, "id"> & { fromRecipeId?: string }>(req);

  if (data.fromRecipeId) {
    const recipe = db.recipes.get(data.fromRecipeId);
    if (!recipe) return err("Recipe not found", 404);
    const id = uid("dd");
    const dish: DailyDish = {
      id,
      name: recipe.name,
      description: data.description || "",
      category: recipe.category,
      price: recipe.sellingPrice,
      allergens: data.allergens || "",
      recipeId: recipe.id,
    };
    db.dailyDishes.set(id, dish);
    return ok(dish, 201);
  }

  if (!data.name?.trim()) return err("name is required");
  const id = uid("dd");
  const dish: DailyDish = { ...data, id, fromRecipeId: undefined } as DailyDish;
  db.dailyDishes.set(id, dish);
  return ok(dish, 201);
}
