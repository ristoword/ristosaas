import { prisma } from "@/lib/db/prisma";

export type BriefingReservation = {
  id: string;
  time: string;
  customerName: string;
  guests: number;
  table: string;
  notes: string;
  allergies: string;
  status: string;
};

export type BriefingStaff = {
  name: string;
  area: string;
  role: string;
  startTime: string;
  endTime: string;
  shiftType: string;
};

export type BriefingActiveOrder = {
  id: string;
  table: string;
  area: string;
  status: string;
  waiter: string;
  itemsCount: number;
  items: string[];
  createdAt: string;
};

export type BriefingTask = {
  id: string;
  title: string;
  message: string;
  type: string;
  href: string | null;
};

export type OperationalBriefing = {
  generatedAt: string;
  date: string;
  dateLabel: string;
  restaurant: {
    ordersToday: number;
    revenueToday: number;
    activeOrders: number;
    completedToday: number;
    byArea: Record<string, number>;
    byStatus: Record<string, number>;
  };
  reservations: {
    total: number;
    totalCovers: number;
    newToday: number;
    list: BriefingReservation[];
  };
  staff: {
    planned: BriefingStaff[];
    onDuty: Array<{ name: string; area: string; role: string; since: string }>;
    plannedCount: number;
    onDutyCount: number;
    byArea: Record<string, number>;
  };
  warehouse: {
    lowStock: Array<{ name: string; qty: number; unit: string; minStock: number }>;
    lowStockCount: number;
    pendingOrders: Array<{ code: string; supplier: string; status: string; expectedAt: string | null }>;
    pendingOrdersCount: number;
  };
  kitchen: {
    activeComande: BriefingActiveOrder[];
    productsToPrepare: Array<{ name: string; qty: number; table: string; area: string }>;
  };
  tasks: {
    unreadCount: number;
    items: BriefingTask[];
    notes: Array<{ area: string; text: string }>;
  };
  hotel: {
    enabled: boolean;
    totalRooms: number;
    occupiedRooms: number;
    arrivalsToday: number;
    departuresToday: number;
    housekeepingPending: number;
  } | null;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function dayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtDateLabel(d: Date) {
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function buildBriefingNarrative(b: OperationalBriefing): string {
  const parts: string[] = [];

  parts.push(`Buongiorno. Ecco la situazione operativa di oggi, ${b.dateLabel}.`);

  // Prenotazioni
  if (b.reservations.total > 0) {
    parts.push(
      `Prenotazioni: ${b.reservations.total} prenotazioni per ${b.reservations.totalCovers} coperti.`,
    );
    const withNotes = b.reservations.list.filter((r) => r.notes || r.allergies);
    if (withNotes.length > 0) {
      const highlights = withNotes.slice(0, 3).map((r) => {
        const extra = [r.allergies && `allergie ${r.allergies}`, r.notes].filter(Boolean).join(", ");
        return `${r.customerName} alle ${r.time}${extra ? ` (${extra})` : ""}`;
      });
      parts.push(`Attenzione: ${highlights.join("; ")}.`);
    }
  } else {
    parts.push("Nessuna prenotazione registrata per oggi.");
  }

  // Staff
  if (b.staff.plannedCount > 0 || b.staff.onDutyCount > 0) {
    const areas = Object.entries(b.staff.byArea)
      .map(([a, n]) => `${n} in ${a}`)
      .join(", ");
    parts.push(
      `Staff: ${b.staff.onDutyCount} persone in servizio adesso, ${b.staff.plannedCount} turni pianificati oggi${areas ? ` (${areas})` : ""}.`,
    );
  }

  // Cucina / ordini
  if (b.restaurant.activeOrders > 0) {
    parts.push(
      `Cucina e sala: ${b.restaurant.activeOrders} comande attive, ${b.restaurant.ordersToday} ordini totali oggi con incasso stimato di ${b.restaurant.revenueToday.toFixed(2)} euro.`,
    );
    if (b.kitchen.productsToPrepare.length > 0) {
      const prep = b.kitchen.productsToPrepare.slice(0, 5).map((p) => `${p.qty}x ${p.name}`).join(", ");
      parts.push(`Da preparare: ${prep}.`);
    }
  } else if (b.restaurant.ordersToday > 0) {
    parts.push(
      `Oggi ${b.restaurant.ordersToday} ordini completati, incasso ${b.restaurant.revenueToday.toFixed(2)} euro. Nessuna comanda attiva al momento.`,
    );
  }

  // Magazzino
  if (b.warehouse.lowStockCount > 0) {
    const items = b.warehouse.lowStock.slice(0, 4).map((i) => i.name).join(", ");
    parts.push(`${b.warehouse.lowStockCount} prodotti sotto scorta minima: ${items}.`);
  }
  if (b.warehouse.pendingOrdersCount > 0) {
    parts.push(`${b.warehouse.pendingOrdersCount} ordini fornitore in attesa di ricezione.`);
  }

  // Task
  if (b.tasks.unreadCount > 0) {
    const taskTitles = b.tasks.items.slice(0, 4).map((t) => t.title).join(", ");
    parts.push(`${b.tasks.unreadCount} cose da fare: ${taskTitles}.`);
  }

  // Hotel
  if (b.hotel?.enabled) {
    parts.push(
      `Hotel: ${b.hotel.occupiedRooms} camere su ${b.hotel.totalRooms} occupate. Arrivi oggi: ${b.hotel.arrivalsToday}, partenze: ${b.hotel.departuresToday}. ${b.hotel.housekeepingPending} camere da pulire.`,
    );
  }

  parts.push("Fine riepilogo. Buon lavoro!");
  return parts.join(" ");
}

export const operationalBriefingRepository = {
  async build(tenantId: string, userId?: string): Promise<OperationalBriefing> {
    const today = todayStr();
    const start = dayStart();
    const now = new Date();

    const [
      ordersToday,
      activeOrders,
      bookings,
      shiftPlans,
      activeShifts,
      warehouseItems,
      pendingPurchaseOrders,
      notifications,
      operationalNotes,
      hotelRooms,
      hotelReservations,
      housekeeping,
    ] = await Promise.all([
      prisma.restaurantOrder.findMany({
        where: { tenantId, createdAt: { gte: start } },
        include: { items: true },
      }),
      prisma.restaurantOrder.findMany({
        where: {
          tenantId,
          status: { notIn: ["chiuso", "annullato", "servito"] },
        },
        include: { items: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.booking.findMany({
        where: { tenantId, date: new Date(`${today}T00:00:00Z`) },
        orderBy: { time: "asc" },
      }),
      prisma.shiftPlan.findMany({
        where: { tenantId, day: today },
        orderBy: [{ area: "asc" }, { startTime: "asc" }],
      }),
      prisma.staffShift.findMany({
        where: { tenantId, clockOutAt: null },
        include: { staffMember: { select: { name: true, role: true } } },
      }),
      prisma.warehouseItem.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
      prisma.purchaseOrder.findMany({
        where: { tenantId, status: { in: ["inviato", "parziale"] }, receivedAt: null },
        include: { supplier: { select: { name: true } } },
        orderBy: { orderedAt: "desc" },
        take: 10,
      }),
      prisma.notification.findMany({
        where: {
          tenantId,
          read: false,
          OR: userId ? [{ userId }, { userId: null }] : [{ userId: null }],
        },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { id: true, type: true, title: true, message: true, href: true },
      }),
      prisma.operationalNote.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { area: true, text: true },
      }),
      prisma.hotelRoom.findMany({ where: { tenantId }, select: { status: true } }),
      prisma.hotelReservation.findMany({
        where: {
          tenantId,
          status: { notIn: ["cancellata", "no_show"] },
        },
        select: { checkInDate: true, checkOutDate: true },
      }),
      prisma.housekeepingTask.findMany({
        where: { tenantId, status: { in: ["todo", "in_progress"] } },
      }),
    ]);

    const revenueToday = ordersToday.reduce(
      (s, o) => s + o.items.reduce((si, i) => si + (i.price?.toNumber() ?? 0) * i.qty, 0),
      0,
    );

    const byArea: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const o of activeOrders) {
      byArea[o.area] = (byArea[o.area] ?? 0) + 1;
      byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    }

    const completedToday = ordersToday.filter((o) => ["servito", "chiuso"].includes(o.status)).length;

    const reservationList: BriefingReservation[] = bookings.map((b) => ({
      id: b.id,
      time: b.time,
      customerName: b.customerName,
      guests: b.guests,
      table: b.table,
      notes: b.notes,
      allergies: b.allergies,
      status: b.status,
    }));

    const newToday = bookings.filter((b) => {
      const created = b.createdAt ?? b.date;
      return created >= start;
    }).length;

    const planned: BriefingStaff[] = shiftPlans.map((s) => ({
      name: s.staffName,
      area: s.area,
      role: s.role,
      startTime: s.startTime,
      endTime: s.endTime,
      shiftType: s.shiftType,
    }));

    const staffByArea: Record<string, number> = {};
    for (const s of planned) {
      staffByArea[s.area] = (staffByArea[s.area] ?? 0) + 1;
    }

    const onDuty = activeShifts.map((s) => ({
      name: s.staffMember.name,
      area: s.staffMember.role,
      role: s.staffMember.role,
      since: s.clockInAt.toISOString(),
    }));

    const lowStock = warehouseItems
      .filter((i) => Number(i.qty) < Number(i.minStock))
      .slice(0, 15)
      .map((i) => ({
        name: i.name,
        qty: Number(i.qty),
        unit: i.unit,
        minStock: Number(i.minStock),
      }));

    const activeComande: BriefingActiveOrder[] = activeOrders.map((o) => ({
      id: o.id,
      table: o.table ?? "—",
      area: o.area,
      status: o.status,
      waiter: o.waiter,
      itemsCount: o.items.length,
      items: o.items.map((i) => i.name),
      createdAt: o.createdAt.toISOString(),
    }));

    const productsToPrepare = activeOrders.flatMap((o) =>
      o.items.map((i) => ({
        name: i.name,
        qty: i.qty,
        table: o.table ?? "—",
        area: o.area,
      })),
    );

    const totalRooms = hotelRooms.length;
    const occupiedRooms = hotelRooms.filter((r) => r.status === "occupata").length;
    const hotelEnabled = totalRooms > 0;
    const arrivalsToday = hotelReservations.filter((r) => r.checkInDate.toISOString().slice(0, 10) === today).length;
    const departuresToday = hotelReservations.filter((r) => r.checkOutDate.toISOString().slice(0, 10) === today).length;

    return {
      generatedAt: now.toISOString(),
      date: today,
      dateLabel: fmtDateLabel(now),
      restaurant: {
        ordersToday: ordersToday.length,
        revenueToday: Math.round(revenueToday * 100) / 100,
        activeOrders: activeOrders.length,
        completedToday,
        byArea,
        byStatus,
      },
      reservations: {
        total: reservationList.length,
        totalCovers: reservationList.reduce((s, r) => s + r.guests, 0),
        newToday,
        list: reservationList,
      },
      staff: {
        planned,
        onDuty,
        plannedCount: planned.length,
        onDutyCount: onDuty.length,
        byArea: staffByArea,
      },
      warehouse: {
        lowStock,
        lowStockCount: warehouseItems.filter((i) => Number(i.qty) < Number(i.minStock)).length,
        pendingOrders: pendingPurchaseOrders.map((po) => ({
          code: po.code,
          supplier: po.supplier.name,
          status: po.status,
          expectedAt: po.expectedAt?.toISOString() ?? null,
        })),
        pendingOrdersCount: pendingPurchaseOrders.length,
      },
      kitchen: {
        activeComande,
        productsToPrepare,
      },
      tasks: {
        unreadCount: notifications.length,
        items: notifications.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          href: n.href,
        })),
        notes: operationalNotes,
      },
      hotel: hotelEnabled
        ? {
            enabled: true,
            totalRooms,
            occupiedRooms,
            arrivalsToday,
            departuresToday,
            housekeepingPending: housekeeping.length,
          }
        : null,
    };
  },
};
