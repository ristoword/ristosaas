import { NextRequest } from "next/server";
import { db, uid } from "@/lib/api/store";
import type { SalaTable } from "@/lib/api/types/rooms";
import { ok, err, body } from "@/lib/api/helpers";

/** GET /api/tables?roomId=room1 */
export async function GET(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get("roomId");
  let results = db.tables.all();
  if (roomId) results = results.filter((t) => t.roomId === roomId);
  return ok(results);
}

/** POST /api/tables — create table */
export async function POST(req: NextRequest) {
  const data = await body<Omit<SalaTable, "id">>(req);
  if (!data.nome?.trim()) return err("nome is required");
  const id = uid("tbl");
  const table: SalaTable = { ...data, id };
  db.tables.set(id, table);
  return ok(table, 201);
}
