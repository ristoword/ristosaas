import { prisma } from "@/lib/db/prisma";
import type { RatePlan } from "@/modules/hotel/domain/types";
import { roomTypesMatch } from "@/modules/hotel/domain/room-type";

function mapPlan(row: {
  id: string;
  code: string;
  name: string;
  roomType: string;
  boardType: RatePlan["boardType"];
  nightlyRate: { toNumber: () => number };
  refundable: boolean;
  active: boolean;
  priceIncludesVat: boolean;
}): RatePlan & { active: boolean } {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    roomType: row.roomType,
    boardType: row.boardType,
    nightlyRate: row.nightlyRate.toNumber(),
    refundable: row.refundable,
    active: row.active,
    priceIncludesVat: row.priceIncludesVat,
  };
}

export type RatePlanInput = {
  code: string;
  name: string;
  roomType: string;
  boardType: RatePlan["boardType"];
  nightlyRate: number;
  refundable?: boolean;
  active?: boolean;
  priceIncludesVat?: boolean;
};

export const hotelRatePlansRepository = {
  async all(tenantId: string, includeInactive = false) {
    const rows = await prisma.hotelRatePlan.findMany({
      where: { tenantId, ...(includeInactive ? {} : { active: true }) },
      orderBy: [{ roomType: "asc" }, { nightlyRate: "asc" }],
    });
    return rows.map(mapPlan);
  },
  async filterByRoomType(tenantId: string, roomType: string) {
    const rows = await prisma.hotelRatePlan.findMany({
      where: { tenantId, active: true },
      orderBy: { nightlyRate: "asc" },
    });
    return rows.filter((row) => roomTypesMatch(row.roomType, roomType)).map(mapPlan);
  },
  async create(tenantId: string, data: RatePlanInput) {
    const row = await prisma.hotelRatePlan.create({
      data: {
        tenantId,
        code: data.code.trim(),
        name: data.name.trim(),
        roomType: data.roomType.trim(),
        boardType: data.boardType,
        nightlyRate: data.nightlyRate,
        refundable: data.refundable ?? true,
        active: data.active ?? true,
        priceIncludesVat: data.priceIncludesVat ?? true,
      },
    });
    return mapPlan(row);
  },
  async update(tenantId: string, id: string, data: Partial<RatePlanInput>) {
    const existing = await prisma.hotelRatePlan.findFirst({ where: { id, tenantId } });
    if (!existing) return null;
    const row = await prisma.hotelRatePlan.update({
      where: { id },
      data: {
        ...(data.code !== undefined ? { code: data.code.trim() } : {}),
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.roomType !== undefined ? { roomType: data.roomType.trim() } : {}),
        ...(data.boardType !== undefined ? { boardType: data.boardType } : {}),
        ...(data.nightlyRate !== undefined ? { nightlyRate: data.nightlyRate } : {}),
        ...(data.refundable !== undefined ? { refundable: data.refundable } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.priceIncludesVat !== undefined ? { priceIncludesVat: data.priceIncludesVat } : {}),
      },
    });
    return mapPlan(row);
  },
  async delete(tenantId: string, id: string) {
    const existing = await prisma.hotelRatePlan.findFirst({ where: { id, tenantId } });
    if (!existing) return false;
    await prisma.hotelRatePlan.delete({ where: { id } });
    return true;
  },
};
