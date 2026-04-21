import { NextRequest } from "next/server";
import { body, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import {
  hardwareRepository,
  type HardwareDeviceConnection,
  type HardwareDeviceStatus,
  type HardwareDeviceType,
  type HardwareDepartment,
} from "@/lib/db/repositories/hardware.repository";

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  return ok(await hardwareRepository.listDevices(getTenantId()));
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const data = await body<{
    name: string;
    type?: HardwareDeviceType;
    department?: HardwareDepartment;
    connection?: HardwareDeviceConnection;
    ipAddress?: string | null;
    port?: number | null;
    status?: HardwareDeviceStatus;
    notes?: string;
  }>(req);
  const created = await hardwareRepository.createDevice(getTenantId(), data);
  return ok(created, 201);
}
