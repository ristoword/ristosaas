import { NextRequest } from "next/server";
import { bookingsCollection } from "@/lib/api/store-ext";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
type Ctx = { params: Promise<{ id: string }> };
const BOOKING_ROLES = ["sala", "cassa", "supervisor"] as const;

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...BOOKING_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const i = bookingsCollection.get(id);
  return i ? ok(i) : err("Not found", 404);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...BOOKING_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const ex = bookingsCollection.get(id);
  if (!ex) return err("Not found", 404);
  const u = await body<any>(req);
  const up = { ...ex, ...u, id };
  bookingsCollection.set(id, up);
  return ok(up);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...BOOKING_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  if (!bookingsCollection.get(id)) return err("Not found", 404);
  bookingsCollection.delete(id);
  return ok({ deleted: true });
}
