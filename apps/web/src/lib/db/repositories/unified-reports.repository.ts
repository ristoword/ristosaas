import { prisma } from "@/lib/db/prisma";

type Range = { from: Date | null; to: Date | null };

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function inRange(range: Range) {
  if (!range.from && !range.to) return undefined;
  return {
    ...(range.from ? { gte: range.from } : {}),
    ...(range.to ? { lte: range.to } : {}),
  };
}

function makeRange(from?: string | null, to?: string | null): Range {
  return {
    from: from ? new Date(`${from}T00:00:00Z`) : null,
    to: to ? new Date(`${to}T23:59:59Z`) : null,
  };
}

export const unifiedReportsRepository = {
  async snapshot(tenantId: string, params?: { from?: string | null; to?: string | null }) {
    const range = makeRange(params?.from, params?.to);
    const today = dateOnly(new Date());

    const [totalRooms, occupiedRooms, reservations, orders, charges, openFolios, stockOutRows, shifts] = await Promise.all([
      prisma.hotelRoom.count({ where: { tenantId } }),
      prisma.hotelRoom.count({ where: { tenantId, status: "occupata" } }),
      prisma.hotelReservation.findMany({
        where: {
          tenantId,
          status: { notIn: ["cancellata", "no_show"] },
          ...(range.from || range.to ? { checkInDate: inRange(range) } : {}),
        },
        select: {
          checkInDate: true,
          checkOutDate: true,
          boardType: true,
          rate: true,
        },
      }),
      prisma.restaurantOrder.findMany({
        where: {
          tenantId,
          status: { in: ["servito", "chiuso"] },
          ...(range.from || range.to ? { createdAt: inRange(range) } : {}),
        },
        select: {
          items: { select: { qty: true, price: true } },
        },
      }),
      prisma.folioCharge.findMany({
        where: {
          folio: { tenantId },
          source: "restaurant",
          ...(range.from || range.to ? { postedAt: inRange(range) } : {}),
        },
        select: { amount: true },
      }),
      prisma.guestFolio.count({ where: { tenantId, status: "open" } }),
      prisma.warehouseMovement.findMany({
        where: {
          tenantId,
          type: "scarico_comanda",
          ...(range.from || range.to ? { date: inRange(range) } : {}),
        },
        select: {
          qty: true,
          item: { select: { costPerUnit: true } },
        },
      }),
      prisma.staffShift.findMany({
        where: {
          tenantId,
          ...(range.from || range.to ? { clockInAt: inRange(range) } : {}),
        },
        include: {
          staffMember: { select: { salary: true, hoursWeek: true } },
        },
      }),
    ]);

    const hotelRevenue = reservations.reduce((sum, reservation) => sum + reservation.rate.toNumber(), 0);
    const restaurantRevenue = orders.reduce(
      (orderSum, order) =>
        orderSum +
        order.items.reduce((itemSum, item) => itemSum + (item.price ? item.price.toNumber() : 0) * item.qty, 0),
      0,
    );
    const integratedRoomChargeRevenue = charges.reduce((sum, charge) => sum + charge.amount.toNumber(), 0);

    const foodCost = stockOutRows.reduce(
      (sum, row) => sum + row.qty.toNumber() * row.item.costPerUnit.toNumber(),
      0,
    );
    const staffCost = shifts.reduce((sum, shift) => {
      if (!shift.clockOutAt) return sum;
      const workedHours = Math.max(0, (shift.clockOutAt.getTime() - shift.clockInAt.getTime()) / (1000 * 60 * 60));
      const monthlyHours = Math.max(1, shift.staffMember.hoursWeek * 4.33);
      const hourlyRate = shift.staffMember.salary.toNumber() / monthlyHours;
      return sum + workedHours * hourlyRate;
    }, 0);
    const totalRevenue = hotelRevenue + restaurantRevenue + integratedRoomChargeRevenue;
    const totalCost = foodCost + staffCost;
    const totalHours = shifts.reduce((sum, shift) => {
      if (!shift.clockOutAt) return sum;
      return sum + Math.max(0, (shift.clockOutAt.getTime() - shift.clockInAt.getTime()) / (1000 * 60 * 60));
    }, 0);
    const activeShifts = shifts.filter((shift) => !shift.clockOutAt).length;

    const arrivalsToday = reservations.filter((reservation) => dateOnly(reservation.checkInDate) === today).length;
    const departuresToday = reservations.filter((reservation) => dateOnly(reservation.checkOutDate) === today).length;
    const boardMix = reservations.reduce(
      (acc, reservation) => {
        acc[reservation.boardType] += 1;
        return acc;
      },
      {
        room_only: 0,
        bed_breakfast: 0,
        half_board: 0,
        full_board: 0,
      },
    );

    return {
      range: { from: params?.from || null, to: params?.to || null },
      occupancy: { occupiedRooms, totalRooms },
      arrivalsToday,
      departuresToday,
      hotelRevenue,
      restaurantRevenue,
      integratedRoomChargeRevenue,
      openFolios,
      realCosts: {
        foodCost,
        staffCost,
        totalCost,
        margin: totalRevenue - totalCost,
      },
      staffOps: {
        totalHours,
        activeShifts,
      },
      boardMix,
    };
  },
};
