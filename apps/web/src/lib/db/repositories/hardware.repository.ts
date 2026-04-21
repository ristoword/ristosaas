import { prisma } from "@/lib/db/prisma";

export type HardwareDeviceType =
  | "stampante_termica"
  | "stampante_fiscale"
  | "display_kds"
  | "lettore_keycard"
  | "cassetto_denaro"
  | "altro";

export type HardwareDeviceConnection = "tcp_ip" | "usb" | "bluetooth" | "hdmi" | "altro";

export type HardwareDeviceStatus = "online" | "offline" | "manutenzione";

export type HardwareDepartment =
  | "cucina"
  | "pizzeria"
  | "bar"
  | "cassa"
  | "sala"
  | "reception"
  | "housekeeping"
  | "magazzino"
  | "altro";

export type PrintRouteEvent =
  | "nuova_comanda"
  | "ordine_bevande"
  | "chiusura_conto"
  | "preconto"
  | "nota_cucina"
  | "keycard_emessa";

export type HardwareDevice = {
  id: string;
  tenantId: string;
  name: string;
  type: HardwareDeviceType;
  department: HardwareDepartment;
  connection: HardwareDeviceConnection;
  ipAddress: string | null;
  port: number | null;
  status: HardwareDeviceStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type PrintRoute = {
  id: string;
  tenantId: string;
  event: PrintRouteEvent;
  department: HardwareDepartment;
  deviceId: string;
  deviceName?: string;
  createdAt: string;
  updatedAt: string;
};

type DeviceRow = {
  id: string;
  tenantId: string;
  name: string;
  type: HardwareDeviceType;
  department: HardwareDepartment;
  connection: HardwareDeviceConnection;
  ipAddress: string | null;
  port: number | null;
  status: HardwareDeviceStatus;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
};

function mapDevice(row: DeviceRow): HardwareDevice {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    type: row.type,
    department: row.department,
    connection: row.connection,
    ipAddress: row.ipAddress,
    port: row.port,
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type RouteRow = {
  id: string;
  tenantId: string;
  event: PrintRouteEvent;
  department: HardwareDepartment;
  deviceId: string;
  createdAt: Date;
  updatedAt: Date;
  device?: { name: string } | null;
};

function mapRoute(row: RouteRow): PrintRoute {
  return {
    id: row.id,
    tenantId: row.tenantId,
    event: row.event,
    department: row.department,
    deviceId: row.deviceId,
    deviceName: row.device?.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const hardwareRepository = {
  async listDevices(tenantId: string): Promise<HardwareDevice[]> {
    const rows = await prisma.hardwareDevice.findMany({
      where: { tenantId },
      orderBy: [{ department: "asc" }, { name: "asc" }],
    });
    return rows.map(mapDevice);
  },

  async createDevice(
    tenantId: string,
    payload: {
      name: string;
      type?: HardwareDeviceType;
      department?: HardwareDepartment;
      connection?: HardwareDeviceConnection;
      ipAddress?: string | null;
      port?: number | null;
      status?: HardwareDeviceStatus;
      notes?: string;
    },
  ): Promise<HardwareDevice> {
    const row = await prisma.hardwareDevice.create({
      data: {
        tenantId,
        name: payload.name.trim(),
        type: payload.type ?? "stampante_termica",
        department: payload.department ?? "cucina",
        connection: payload.connection ?? "tcp_ip",
        ipAddress: payload.ipAddress?.trim() || null,
        port: payload.port ?? null,
        status: payload.status ?? "offline",
        notes: payload.notes ?? "",
      },
    });
    return mapDevice(row);
  },

  async updateDevice(
    tenantId: string,
    id: string,
    payload: Partial<{
      name: string;
      type: HardwareDeviceType;
      department: HardwareDepartment;
      connection: HardwareDeviceConnection;
      ipAddress: string | null;
      port: number | null;
      status: HardwareDeviceStatus;
      notes: string;
    }>,
  ): Promise<HardwareDevice | null> {
    const existing = await prisma.hardwareDevice.findFirst({ where: { id, tenantId } });
    if (!existing) return null;
    const row = await prisma.hardwareDevice.update({
      where: { id },
      data: {
        name: payload.name?.trim(),
        type: payload.type ?? undefined,
        department: payload.department ?? undefined,
        connection: payload.connection ?? undefined,
        ipAddress:
          payload.ipAddress === undefined ? undefined : payload.ipAddress?.trim() || null,
        port: payload.port === undefined ? undefined : payload.port,
        status: payload.status ?? undefined,
        notes: payload.notes ?? undefined,
      },
    });
    return mapDevice(row);
  },

  async deleteDevice(tenantId: string, id: string): Promise<boolean> {
    const existing = await prisma.hardwareDevice.findFirst({ where: { id, tenantId } });
    if (!existing) return false;
    await prisma.hardwareDevice.delete({ where: { id } });
    return true;
  },

  async listRoutes(tenantId: string): Promise<PrintRoute[]> {
    const rows = await prisma.printRoute.findMany({
      where: { tenantId },
      orderBy: [{ event: "asc" }, { department: "asc" }],
      include: { device: { select: { name: true } } },
    });
    return rows.map(mapRoute);
  },

  async createRoute(
    tenantId: string,
    payload: { event: PrintRouteEvent; department: HardwareDepartment; deviceId: string },
  ): Promise<PrintRoute | null> {
    const device = await prisma.hardwareDevice.findFirst({
      where: { id: payload.deviceId, tenantId },
    });
    if (!device) return null;
    const row = await prisma.printRoute.upsert({
      where: {
        tenantId_event_department: {
          tenantId,
          event: payload.event,
          department: payload.department,
        },
      },
      update: { deviceId: payload.deviceId },
      create: {
        tenantId,
        event: payload.event,
        department: payload.department,
        deviceId: payload.deviceId,
      },
      include: { device: { select: { name: true } } },
    });
    return mapRoute(row);
  },

  async deleteRoute(tenantId: string, id: string): Promise<boolean> {
    const existing = await prisma.printRoute.findFirst({ where: { id, tenantId } });
    if (!existing) return false;
    await prisma.printRoute.delete({ where: { id } });
    return true;
  },
};
