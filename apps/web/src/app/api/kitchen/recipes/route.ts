import { NextRequest } from "next/server";
import { db, uid } from "@/lib/api/store";
import { calcFoodCost } from "@/lib/api/types/kitchen";
import type { Recipe } from "@/lib/api/types/kitchen";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const KITCHEN_ROLES = ["cucina", "supervisor"] as const;

/** GET /api/kitchen/recipes — list all recipes */
export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, [...KITCHEN_ROLES]);
  if (guard.error) return guard.error;
  return ok(db.recipes.all());
}

/** POST /api/kitchen/recipes — create recipe + auto food-cost */
export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, [...KITCHEN_ROLES]);
  if (guard.error) return guard.error;
  const data = await body<Omit<Recipe, "id" | "createdAt">>(req);
  if (!data.name?.trim()) return err("name is required");

  const id = uid("rec");
  const recipe: Recipe = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  };

  db.recipes.set(id, recipe);

  const foodCost = calcFoodCost(recipe);

  return ok({ recipe, foodCost }, 201);
}
