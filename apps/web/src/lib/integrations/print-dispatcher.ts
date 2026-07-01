import { prisma } from "@/lib/db/prisma";
import { hardwareRepository, type HardwareDepartment, type PrintRouteEvent } from "@/lib/db/repositories/hardware.repository";
import { escposText, sendEscPosTcp } from "@/lib/integrations/escpos";
import { fireAndForget } from "@/lib/api/helpers";

export async function resolvePrintRoute(tenantId: string, event: PrintRouteEvent, department: HardwareDepartment) {
  const routes = await hardwareRepository.listRoutes(tenantId);
  return routes.find((r) => r.event === event && r.department === department) ?? null;
}

export async function dispatchPrintJob(
  tenantId: string,
  event: PrintRouteEvent,
  department: HardwareDepartment,
  lines: string[],
) {
  const route = await resolvePrintRoute(tenantId, event, department);
  if (!route) {
    return { sent: false, reason: "no_route" as const };
  }
  const device = await prisma.hardwareDevice.findFirst({
    where: { id: route.deviceId, tenantId },
  });
  if (!device?.ipAddress || !device.port) {
    await prisma.printJob.create({
      data: {
        tenantId,
        deviceId: device?.id,
        event,
        department,
        payload: lines.join("\n"),
        status: "error",
        errorMessage: "Dispositivo senza IP/porta configurati",
      },
    });
    return { sent: false, reason: "no_device_address" as const };
  }

  const job = await prisma.printJob.create({
    data: {
      tenantId,
      deviceId: device.id,
      event,
      department,
      payload: lines.join("\n"),
      status: "pending",
    },
  });

  try {
    const buffer = escposText(lines);
    await sendEscPosTcp(device.ipAddress, device.port, buffer);
    await prisma.printJob.update({
      where: { id: job.id },
      data: { status: "sent", sentAt: new Date() },
    });
    await prisma.hardwareDevice.update({
      where: { id: device.id },
      data: { status: "online" },
    });
    return { sent: true, jobId: job.id, deviceName: device.name };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.printJob.update({
      where: { id: job.id },
      data: { status: "error", errorMessage: message },
    });
    return { sent: false, reason: "print_error" as const, error: message, jobId: job.id };
  }
}

export function dispatchPrintJobAsync(
  tenantId: string,
  event: PrintRouteEvent,
  department: HardwareDepartment,
  lines: string[],
) {
  fireAndForget(dispatchPrintJob(tenantId, event, department, lines), `print:${event}:${department}`);
}

export async function testDevicePrint(tenantId: string, deviceId: string) {
  const device = await prisma.hardwareDevice.findFirst({ where: { id: deviceId, tenantId } });
  if (!device?.ipAddress || !device.port) {
    throw new Error("Configura IP e porta TCP del dispositivo");
  }
  const lines = [
    "RistoSimply — Test stampa",
    new Date().toLocaleString("it-IT"),
    device.name,
    "OK",
  ];
  const buffer = escposText(lines);
  await sendEscPosTcp(device.ipAddress, device.port, buffer);
  await prisma.hardwareDevice.update({ where: { id: device.id }, data: { status: "online" } });
  return { ok: true };
}
