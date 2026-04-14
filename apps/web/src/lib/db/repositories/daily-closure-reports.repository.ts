import { prisma } from "@/lib/db/prisma";

export type DailyClosureReportDto = {
  id: string;
  date: string;
  foodSpend: number;
  staffSpend: number;
  revenue: number;
  notes: string;
};

function mapReport(row: {
  id: string;
  date: Date;
  foodSpend: { toNumber: () => number };
  staffSpend: { toNumber: () => number };
  revenue: { toNumber: () => number };
  notes: string;
}): DailyClosureReportDto {
  return {
    id: row.id,
    date: row.date.toISOString().slice(0, 10),
    foodSpend: row.foodSpend.toNumber(),
    staffSpend: row.staffSpend.toNumber(),
    revenue: row.revenue.toNumber(),
    notes: row.notes,
  };
}

export const dailyClosureReportsRepository = {
  async list(tenantId: string, params?: { from?: string | null; to?: string | null }) {
    const from = params?.from ? new Date(`${params.from}T00:00:00Z`) : null;
    const to = params?.to ? new Date(`${params.to}T23:59:59Z`) : null;
    const rows = await prisma.dailyClosureReport.findMany({
      where: {
        tenantId,
        ...((from || to)
          ? {
              date: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { date: "desc" },
    });
    return rows.map(mapReport);
  },
  async upsert(
    tenantId: string,
    payload: { date: string; foodSpend: number; staffSpend: number; revenue: number; notes?: string },
  ) {
    const date = new Date(`${payload.date}T00:00:00Z`);
    const row = await prisma.dailyClosureReport.upsert({
      where: {
        tenantId_date: { tenantId, date },
      },
      update: {
        foodSpend: payload.foodSpend,
        staffSpend: payload.staffSpend,
        revenue: payload.revenue,
        notes: payload.notes || "",
      },
      create: {
        tenantId,
        date,
        foodSpend: payload.foodSpend,
        staffSpend: payload.staffSpend,
        revenue: payload.revenue,
        notes: payload.notes || "",
      },
    });
    return mapReport(row);
  },
};
