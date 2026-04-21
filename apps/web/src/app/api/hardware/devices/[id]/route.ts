import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import {
  hardwareRepository,
  type HardwareDeviceConnection,
  type HardwareDeviceStatus,
  type HardwareDeviceType,
  type HardwareDepartment,
} from "@/lib/db/repositories/hardware.repository";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const data = await body<
    Partial<{
      name: string;
      type: HardwareDeviceType;
      department: HardwareDepartment;
      connection: HardwareDeviceConnection;
      ipAddress: string | null;
      port: number | null;
      status: HardwareDeviceStatus;
      notes: string;
    }>
  >(req);
  const updated = await hardwareRepository.updateDevice(getTenantId(), id, data);
  if (!updated) return err("Dispositivo non trovato", 404);
  return ok(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const deleted = await hardwareRepository.deleteDevice(getTenantId(), id);
  if (!deleted) return err("Dispositivo non trovato", 404);
  return ok({ deleted: true });
}
