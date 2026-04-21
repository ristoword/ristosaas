import { prisma } from "@/lib/db/prisma";
import type { HotelRoom } from "@/modules/hotel/domain/types";

function mapRoom(row: {
  id: string;
  code: string;
  floor: number;
  capacity: number;
  status: HotelRoom["status"];
  roomType: string;
  ratePlanCode: string | null;
  defaultNightlyRate: { toNumber: () => number };
}): HotelRoom {
  return {
    id: row.id,
    code: row.code,
    floor: row.floor,
    capacity: row.capacity,
    status: row.status,
    roomType: row.roomType,
    ratePlanCode: row.ratePlanCode ?? undefined,
    defaultNightlyRate: row.defaultNightlyRate.toNumber(),
  };
}

export const hotelRoomsRepository = {
  async all(tenantId: string) {
    const rows = await prisma.hotelRoom.findMany({
      where: { tenantId },
      orderBy: [{ floor: "asc" }, { code: "asc" }],
    });
    return rows.map(mapRoom);
  },
  async get(tenantId: string, id: string) {
    const row = await prisma.hotelRoom.findFirst({
      where: { id, tenantId },
    });
    return row ? mapRoom(row) : null;
  },
  async create(tenantId: string, data: Omit<HotelRoom, "id">) {
    const row = await prisma.hotelRoom.create({
      data: {
        tenantId,
        code: data.code,
        floor: data.floor,
        capacity: data.capacity,
        status: data.status,
        roomType: data.roomType,
        ratePlanCode: data.ratePlanCode ?? null,
        defaultNightlyRate: data.defaultNightlyRate ?? 0,
      },
    });
    return mapRoom(row);
  },
  async update(tenantId: string, id: string, data: Partial<HotelRoom>) {
    const existing = await prisma.hotelRoom.findFirst({ where: { id, tenantId } });
    if (!existing) return null;
    const row = await prisma.hotelRoom.update({
      where: { id },
      data: {
        code: data.code,
        floor: data.floor,
        capacity: data.capacity,
        status: data.status,
        roomType: data.roomType,
        ratePlanCode: data.ratePlanCode === undefined ? undefined : (data.ratePlanCode ?? null),
        defaultNightlyRate: data.defaultNightlyRate === undefined ? undefined : data.defaultNightlyRate,
      },
    });
    return mapRoom(row);
  },
  async delete(tenantId: string, id: string) {
    const existing = await prisma.hotelRoom.findFirst({ where: { id, tenantId } });
    if (!existing) return false;
    await prisma.hotelRoom.delete({ where: { id } });
    return true;
  },
};
