import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { listAdapters } from "@/lib/hotel/guest-register-transmission/registry";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin", "supervisor"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  return ok({ adapters: listAdapters() });
}
