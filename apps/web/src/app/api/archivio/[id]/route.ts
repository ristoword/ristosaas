import { NextRequest } from "next/server";
import { archivioCollection } from "@/lib/api/store-ext";
import { ok, err, body } from "@/lib/api/helpers";
type Ctx = { params: Promise<{ id: string }> };
export async function GET(_r: NextRequest, ctx: Ctx) { const { id } = await ctx.params; const i = archivioCollection.get(id); return i ? ok(i) : err("Not found", 404); }
export async function PUT(req: NextRequest, ctx: Ctx) { const { id } = await ctx.params; const ex = archivioCollection.get(id); if (!ex) return err("Not found", 404); const u = await body<any>(req); const up = { ...ex, ...u, id }; archivioCollection.set(id, up); return ok(up); }
export async function DELETE(_r: NextRequest, ctx: Ctx) { const { id } = await ctx.params; if (!archivioCollection.get(id)) return err("Not found", 404); archivioCollection.delete(id); return ok({ deleted: true }); }
