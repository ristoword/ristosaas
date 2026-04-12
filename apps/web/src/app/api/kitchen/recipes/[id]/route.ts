import { NextRequest } from "next/server";
import { db } from "@/lib/api/store";
import { calcFoodCost } from "@/lib/api/types/kitchen";
import type { Recipe } from "@/lib/api/types/kitchen";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const KITCHEN_ROLES = ["cucina", "supervisor"] as const;

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/kitchen/recipes/:id — single recipe + food cost */
export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...KITCHEN_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const recipe = db.recipes.get(id);
  if (!recipe) return err("Recipe not found", 404);
  return ok({ recipe, foodCost: calcFoodCost(recipe) });
}

/** PUT /api/kitchen/recipes/:id — update recipe, recalculate food cost */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...KITCHEN_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const existing = db.recipes.get(id);
  if (!existing) return err("Recipe not found", 404);

  const updates = await body<Partial<Recipe>>(req);
  const updated: Recipe = { ...existing, ...updates, id, createdAt: existing.createdAt };
  db.recipes.set(id, updated);

  return ok({ recipe: updated, foodCost: calcFoodCost(updated) });
}

/** DELETE /api/kitchen/recipes/:id */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...KITCHEN_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  if (!db.recipes.get(id)) return err("Recipe not found", 404);
  db.recipes.delete(id);
  return ok({ deleted: true });
}
