import { NextRequest } from "next/server";
import { body, err, ok, withErrorHandler} from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import {
  hardwareRepository,
  type HardwareDepartment,
  type PrintRouteEvent,
} from "@/lib/db/repositories/hardware.repository";

export const GET = withErrorHandler(async (req) => {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  return ok(await hardwareRepository.listRoutes(getTenantId()));
});

export const POST = withErrorHandler(async (req) => {
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
});
