import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import {
  hardwareRepository,
  type HardwareDepartment,
  type PrintRouteEvent,
} from "@/lib/db/repositories/hardware.repository";

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  return ok(await hardwareRepository.listRoutes(getTenantId()));
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const data = await body<{
    event: PrintRouteEvent;
    department: HardwareDepartment;
    deviceId: string;
  }>(req);
  const created = await hardwareRepository.createRoute(getTenantId(), data);
  if (!created) return err("Dispositivo non trovato per la rotta", 404);
  return ok(created, 201);
}
