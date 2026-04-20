import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { createTableToken } from "@/lib/security/table-token";

const TOKEN_ROLES = ["sala", "supervisor", "owner", "super_admin"] as const;

/** Server-signed deterministic tokens for a batch of tableIds. */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, TOKEN_ROLES);
  if (guard.error) return guard.error;

  const payload = await body<{ tableIds?: unknown }>(req);
  const raw = Array.isArray(payload?.tableIds) ? payload.tableIds : [];
  const tableIds = raw.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length < 80).slice(0, 500);
  if (tableIds.length === 0) return err("tableIds required", 400);

  const tenantId = getTenantId();
  const owned = await prisma.restaurantTable.findMany({
    where: { tenantId, id: { in: tableIds } },
    select: { id: true },
  });

  const tokens = owned.map((t) => ({ id: t.id, token: createTableToken({ tenantId, tableId: t.id }) }));
  return ok({ tokens });
}
