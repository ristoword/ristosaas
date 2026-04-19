import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getPlatformConfig, setMaintenanceMode } from "@/lib/db/repositories/platform.repository";

const ADMIN_ROLES = ["super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;
  return ok(await getPlatformConfig());
}

export async function PATCH(req: NextRequest) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;
  const payload = await body<{ maintenanceMode?: boolean }>(req);
  if (typeof payload?.maintenanceMode !== "boolean") return err("maintenanceMode boolean required");
  return ok(await setMaintenanceMode(payload.maintenanceMode));
}
