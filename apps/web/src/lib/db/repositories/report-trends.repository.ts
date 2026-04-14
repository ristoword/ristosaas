import { prisma } from "@/lib/db/prisma";

type TrendPeriod = {
  revenue: number;
  costs: number;
  margin: number;
  reportsCount: number;
  deltaRevenuePct: number | null;
};

type TrendSnapshot = {
  day: TrendPeriod;
  week: TrendPeriod;
  month: TrendPeriod;
  forecast: {
    next7: ForecastPeriod;
    next30: ForecastPeriod;
  };
};

type ForecastPeriod = {
  horizonDays: number;
  projectedRevenue: number;
  projectedCosts: number;
  projectedMargin: number;
  confidence: "low" | "medium" | "high";
};

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function shiftDays(date: Date, days: number) {
  const clone = new Date(date);
  clone.setUTCDate(clone.getUTCDate() + days);
  return clone;
}

function toTrendPeriod(rows: Array<{
  revenue: { toNumber: () => number };
  foodSpend: { toNumber: () => number };
  staffSpend: { toNumber: () => number };
}>, previousRevenue: number): TrendPeriod {
  const revenue = rows.reduce((sum, row) => sum + row.revenue.toNumber(), 0);
  const costs = rows.reduce((sum, row) => sum + row.foodSpend.toNumber() + row.staffSpend.toNumber(), 0);
  const margin = revenue - costs;
  const deltaRevenuePct = previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : null;

  return {
    revenue,
    costs,
    margin,
    reportsCount: rows.length,
    deltaRevenuePct,
  };
}

async function periodStats(tenantId: string, from: Date, to: Date, previousFrom: Date, previousTo: Date) {
  const [rows, previousRows] = await Promise.all([
    prisma.dailyClosureReport.findMany({
      where: { tenantId, date: { gte: from, lte: to } },
      select: { revenue: true, foodSpend: true, staffSpend: true },
    }),
    prisma.dailyClosureReport.findMany({
      where: { tenantId, date: { gte: previousFrom, lte: previousTo } },
      select: { revenue: true },
    }),
  ]);

  const previousRevenue = previousRows.reduce((sum, row) => sum + row.revenue.toNumber(), 0);
  return toTrendPeriod(rows, previousRevenue);
}

export const reportTrendsRepository = {
  async snapshot(tenantId: string): Promise<TrendSnapshot> {
    const today = startOfUtcDay(new Date());
    const todayEnd = endOfUtcDay(today);

    const dayFrom = today;
    const dayTo = todayEnd;
    const prevDayFrom = shiftDays(dayFrom, -1);
    const prevDayTo = endOfUtcDay(prevDayFrom);

    const weekFrom = shiftDays(today, -6);
    const weekTo = todayEnd;
    const prevWeekFrom = shiftDays(weekFrom, -7);
    const prevWeekTo = endOfUtcDay(shiftDays(weekTo, -7));

    const monthFrom = shiftDays(today, -29);
    const monthTo = todayEnd;
    const prevMonthFrom = shiftDays(monthFrom, -30);
    const prevMonthTo = endOfUtcDay(shiftDays(monthTo, -30));

    const [day, week, month] = await Promise.all([
      periodStats(tenantId, dayFrom, dayTo, prevDayFrom, prevDayTo),
      periodStats(tenantId, weekFrom, weekTo, prevWeekFrom, prevWeekTo),
      periodStats(tenantId, monthFrom, monthTo, prevMonthFrom, prevMonthTo),
    ]);

    const forecast7 = projectForward(week, 7);
    const forecast30 = projectForward(month, 30);

    return {
      day,
      week,
      month,
      forecast: {
        next7: forecast7,
        next30: forecast30,
      },
    };
  },
};

function projectForward(period: TrendPeriod, horizonDays: number): ForecastPeriod {
  const divisor = Math.max(1, period.reportsCount);
  const dailyRevenue = period.revenue / divisor;
  const dailyCosts = period.costs / divisor;

  const growthFactor = period.deltaRevenuePct != null ? 1 + period.deltaRevenuePct / 100 : 1;
  const normalizedGrowth = Math.max(0.6, Math.min(1.4, growthFactor));

  const projectedRevenue = dailyRevenue * horizonDays * normalizedGrowth;
  const projectedCosts = dailyCosts * horizonDays;
  const projectedMargin = projectedRevenue - projectedCosts;

  let confidence: ForecastPeriod["confidence"] = "low";
  if (period.reportsCount >= 20) confidence = "high";
  else if (period.reportsCount >= 7) confidence = "medium";

  return {
    horizonDays,
    projectedRevenue,
    projectedCosts,
    projectedMargin,
    confidence,
  };
}
