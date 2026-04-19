import { NextRequest } from "next/server";
import type { SalaTable } from "@/lib/api/types/rooms";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { operationsRepository } from "@/lib/db/repositories/operations.repository";

const TABLE_ROLES = ["owner", "supervisor", "sala", "cassa", "super_admin"] as const;

/** GET /api/tables?roomId=room1 */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, TABLE_ROLES);
  if (guard.error) return guard.error;
  const roomId = req.nextUrl.searchParams.get("roomId");
  return ok(await operationsRepository.tables.list(getTenantId(), roomId ?? undefined));
}

/** POST /api/tables — create table */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, TABLE_ROLES);
  if (guard.error) return guard.error;
  const data = await body<Omit<SalaTable, "id">>(req);
  if (!data.nome?.trim()) return err("nome is required");
  const table = await operationsRepository.tables.create(getTenantId(), data);
  return ok(table, 201);
}
