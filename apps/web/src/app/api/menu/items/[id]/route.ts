import { NextRequest } from "next/server";
import { db } from "@/lib/api/store";
import type { MenuItem } from "@/lib/api/types/kitchen";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const MENU_ROLES = ["cucina", "sala", "cassa", "supervisor"] as const;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...MENU_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const item = db.menuItems.get(id);
  if (!item) return err("Menu item not found", 404);
  return ok(item);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...MENU_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const existing = db.menuItems.get(id);
  if (!existing) return err("Menu item not found", 404);
  const updates = await body<Partial<MenuItem>>(req);
  const updated: MenuItem = { ...existing, ...updates, id };
  db.menuItems.set(id, updated);
  return ok(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...MENU_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  if (!db.menuItems.get(id)) return err("Menu item not found", 404);
  db.menuItems.delete(id);
  return ok({ deleted: true });
}
