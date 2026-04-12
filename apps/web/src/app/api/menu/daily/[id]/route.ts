import { NextRequest } from "next/server";
import { db } from "@/lib/api/store";
import type { DailyDish } from "@/lib/api/types/kitchen";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const MENU_ROLES = ["cucina", "sala", "cassa", "supervisor"] as const;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...MENU_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const dish = db.dailyDishes.get(id);
  if (!dish) return err("Daily dish not found", 404);
  return ok(dish);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...MENU_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const existing = db.dailyDishes.get(id);
  if (!existing) return err("Daily dish not found", 404);
  const updates = await body<Partial<DailyDish>>(req);
  const updated: DailyDish = { ...existing, ...updates, id };
  db.dailyDishes.set(id, updated);
  return ok(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...MENU_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  if (!db.dailyDishes.get(id)) return err("Daily dish not found", 404);
  db.dailyDishes.delete(id);
  return ok({ deleted: true });
}
