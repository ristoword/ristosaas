import { NextRequest } from "next/server";
import type { MenuItem } from "@/lib/api/types/kitchen";
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
  const item = await kitchenMenuRepository.getMenuItem(getTenantId(), id);
  if (!item) return err("Menu item not found", 404);
  return ok(item);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...MENU_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const updates = await body<Partial<MenuItem>>(req);
  let nextUpdates = updates;
  if (updates.recipeId) {
    const recipe = await kitchenMenuRepository.getRecipe(getTenantId(), updates.recipeId);
    if (recipe) {
      const fc = await kitchenMenuRepository.calcRecipeFoodCostRealtime(getTenantId(), recipe);
      nextUpdates = {
        ...updates,
        foodCostPct: Math.round(fc.fcPct * 10) / 10,
      };
    }
  }
  const updated = await kitchenMenuRepository.updateMenuItem(getTenantId(), id, nextUpdates);
  if (!updated) return err("Menu item not found", 404);
  return ok(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...MENU_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const deleted = await kitchenMenuRepository.deleteMenuItem(getTenantId(), id);
  if (!deleted) return err("Menu item not found", 404);
  return ok({ deleted: true });
}
