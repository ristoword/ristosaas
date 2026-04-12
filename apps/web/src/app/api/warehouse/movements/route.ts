import { NextRequest } from "next/server";
import { db } from "@/lib/api/store";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const WAREHOUSE_ROLES = ["magazzino", "supervisor"] as const;

export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;
  return ok(db.stockMovements.all());
}
