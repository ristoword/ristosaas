import { NextRequest } from "next/server";
import { db } from "@/lib/api/store";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const INTEGRATION_ROLES = ["hotel_manager", "reception", "cassa", "supervisor", "owner", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, INTEGRATION_ROLES);
  if (guard.error) return guard.error;
  return ok(db.integration.folioCharges.all());
}
