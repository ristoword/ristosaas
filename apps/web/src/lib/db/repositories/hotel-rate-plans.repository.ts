import { prisma } from "@/lib/db/prisma";
import type { RatePlan } from "@/modules/hotel/domain/types";

function mapPlan(row: {
  id: string;
  code: string;
  name: string;
  roomType: string;
  boardType: RatePlan["boardType"];
  nightlyRate: { toNumber: () => number };
  refundable: boolean;
  active: boolean;
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
  };
}

export const hotelRatePlansRepository = {
  async all(tenantId: string) {
    const rows = await prisma.hotelRatePlan.findMany({
      where: { tenantId, active: true },
      orderBy: [{ roomType: "asc" }, { nightlyRate: "asc" }],
    });
    return rows.map(mapPlan);
  },
  async filterByRoomType(tenantId: string, roomType: string) {
    const rows = await prisma.hotelRatePlan.findMany({
      where: { tenantId, roomType, active: true },
      orderBy: { nightlyRate: "asc" },
    });
    return rows.map(mapPlan);
  },
};
