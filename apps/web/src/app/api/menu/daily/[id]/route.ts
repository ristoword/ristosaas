import { NextRequest } from "next/server";
import type { DailyDish } from "@/lib/api/types/kitchen";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { kitchenMenuRepository } from "@/lib/db/repositories/kitchen-menu.repository";

const MENU_ROLES = ["cucina", "sala", "cassa", "supervisor"] as const;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...MENU_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const dish = await kitchenMenuRepository.getDailyDish(getTenantId(), id);
  if (!dish) return err("Daily dish not found", 404);
  return ok(dish);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...MENU_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const updates = await body<Partial<DailyDish>>(req);
  const updated = await kitchenMenuRepository.updateDailyDish(getTenantId(), id, updates);
  if (!updated) return err("Daily dish not found", 404);
  return ok(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...MENU_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const deleted = await kitchenMenuRepository.deleteDailyDish(getTenantId(), id);
  if (!deleted) return err("Daily dish not found", 404);
  return ok({ deleted: true });
}
