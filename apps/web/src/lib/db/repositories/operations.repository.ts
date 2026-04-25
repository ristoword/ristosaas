import { prisma } from "@/lib/db/prisma";
import type {
  ArchivedOrder,
  AsportoOrder,
  Booking,
  CateringEvent,
  Room,
  SalaTable,
  StaffMember,
  StaffShift,
  Supplier,
} from "@/lib/api-client";

function mapStaff(row: {
  id: string; userId?: string | null; name: string; role: string; email: string; phone: string; hireDate: Date;
  salary: { toNumber: () => number }; status: string; hoursWeek: number; notes: string;
}): StaffMember {
  return {
    id: row.id,
    userId: row.userId ?? null,
    name: row.name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    hireDate: row.hireDate.toISOString().slice(0, 10),
    salary: row.salary.toNumber(),
    status: row.status as StaffMember["status"],
    hoursWeek: row.hoursWeek,
    notes: row.notes,
  };
}

function mapBooking(row: {
  id: string; customerName: string; phone: string; email: string; date: Date; time: string; guests: number;
  table: string; notes: string; status: string; allergies: string;
}): Booking {
  return {
    id: row.id,
    customerName: row.customerName,
    phone: row.phone,
    email: row.email,
    date: row.date.toISOString().slice(0, 10),
    time: row.time,
    guests: row.guests,
    table: row.table,
    notes: row.notes,
    status: row.status as Booking["status"],
    allergies: row.allergies,
  };
}

function mapSupplier(row: {
  id: string; name: string; category: string; email: string; phone: string; address: string; piva: string;
  paymentTerms: string; rating: number; notes: string; active: boolean;
}): Supplier {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    email: row.email,
    phone: row.phone,
    address: row.address,
    piva: row.piva,
    paymentTerms: row.paymentTerms,
    rating: row.rating,
    notes: row.notes,
    active: row.active,
  };
}

function mapCatering(row: {
  id: string; name: string; date: Date; guests: number; venue: string; budget: { toNumber: () => number };
  status: string; contact: string; phone: string; menu: string; notes: string; depositPaid: boolean;
}): CateringEvent {
  return {
    id: row.id,
    name: row.name,
    date: row.date.toISOString().slice(0, 10),
    guests: row.guests,
    venue: row.venue,
    budget: row.budget.toNumber(),
    status: row.status as CateringEvent["status"],
    contact: row.contact,
    phone: row.phone,
    menu: row.menu,
    notes: row.notes,
    depositPaid: row.depositPaid,
  };
}

function mapAsporto(row: {
  id: string; customerName: string; phone: string; items: unknown; total: { toNumber: () => number }; status: string;
  pickupTime: string; notes: string; createdAt: Date; type: string; address: string;
}): AsportoOrder {
  return {
    id: row.id,
    customerName: row.customerName,
    phone: row.phone,
    items: Array.isArray(row.items) ? (row.items as AsportoOrder["items"]) : [],
    total: row.total.toNumber(),
    status: row.status as AsportoOrder["status"],
    pickupTime: row.pickupTime,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    type: row.type as AsportoOrder["type"],
    address: row.address,
  };
}

function mapArchived(row: {
  id: string; date: Date; table: string; waiter: string; items: unknown; total: { toNumber: () => number };
  status: string; paymentMethod: string; closedAt: Date;
}): ArchivedOrder {
  return {
    id: row.id,
    date: row.date.toISOString().slice(0, 10),
    table: row.table,
    waiter: row.waiter,
    items: Array.isArray(row.items) ? (row.items as ArchivedOrder["items"]) : [],
    total: row.total.toNumber(),
    status: row.status as ArchivedOrder["status"],
    paymentMethod: row.paymentMethod as ArchivedOrder["paymentMethod"],
    closedAt: row.closedAt.toISOString(),
  };
}

function mapRoom(row: { id: string; name: string; tables: number }): Room {
  return { id: row.id, name: row.name, tables: row.tables };
}

function mapTable(row: {
  id: string; nome: string; posti: number; x: number; y: number; forma: string; stato: string; roomId: string;
}): SalaTable {
  return {
    id: row.id,
    nome: row.nome,
    posti: row.posti,
    x: row.x,
    y: row.y,
    forma: row.forma as SalaTable["forma"],
    stato: row.stato as SalaTable["stato"],
    roomId: row.roomId,
  };
}

function mapShift(row: {
  id: string;
  staffId: string;
  clockInAt: Date;
  clockOutAt: Date | null;
  notes: string;
}): StaffShift {
  const durationHours = row.clockOutAt
    ? Math.max(0, (row.clockOutAt.getTime() - row.clockInAt.getTime()) / (1000 * 60 * 60))
    : null;
  return {
    id: row.id,
    staffId: row.staffId,
    clockInAt: row.clockInAt.toISOString(),
    clockOutAt: row.clockOutAt ? row.clockOutAt.toISOString() : null,
    notes: row.notes,
    durationHours,
  };
}

async function deleteScoped(model: "staffMember" | "booking" | "supplier" | "cateringEvent" | "takeawayOrder" | "archivedOrder" | "restaurantTable", tenantId: string, id: string) {
  const existing = await (prisma as any)[model].findFirst({ where: { id, tenantId } });
  if (!existing) return false;
  await (prisma as any)[model].delete({ where: { id } });
  return true;
}

export const operationsRepository = {
  rooms: {
    list: async (tenantId: string) => (await prisma.restaurantRoom.findMany({ where: { tenantId }, orderBy: { name: "asc" } })).map(mapRoom),
    /**
     * Ensure at least one room exists for this tenant. Returns the first room
     * available (creating a default "Sala 1" if none). Used by the sala UI
     * when the owner presses "Aggiungi tavolo" on a blank layout.
     */
    ensureDefault: async (tenantId: string) => {
      const existing = await prisma.restaurantRoom.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "asc" },
      });
      if (existing) return mapRoom(existing);
      const created = await prisma.restaurantRoom.create({
        data: { tenantId, name: "Sala 1", tables: 0 },
      });
      return mapRoom(created);
    },
  },
  tables: {
    list: async (tenantId: string, roomId?: string) =>
      (await prisma.restaurantTable.findMany({ where: { tenantId, roomId }, orderBy: { nome: "asc" } })).map(mapTable),
    get: async (tenantId: string, id: string) => {
      const row = await prisma.restaurantTable.findFirst({ where: { tenantId, id } });
      return row ? mapTable(row) : null;
    },
    create: async (tenantId: string, data: Omit<SalaTable, "id">) => mapTable(await prisma.restaurantTable.create({ data: { tenantId, ...data } })),
    update: async (tenantId: string, id: string, updates: Partial<SalaTable>) => {
      const exists = await prisma.restaurantTable.findFirst({ where: { tenantId, id } });
      if (!exists) return null;
      return mapTable(await prisma.restaurantTable.update({ where: { id }, data: updates }));
    },
    setStatus: async (tenantId: string, id: string, stato: SalaTable["stato"]) => {
      const exists = await prisma.restaurantTable.findFirst({ where: { tenantId, id } });
      if (!exists) return null;
      return mapTable(await prisma.restaurantTable.update({ where: { id }, data: { stato } }));
    },
    delete: (tenantId: string, id: string) => deleteScoped("restaurantTable", tenantId, id),
  },
  staff: {
    list: async (tenantId: string) => (await prisma.staffMember.findMany({ where: { tenantId }, orderBy: { name: "asc" } })).map(mapStaff),
    get: async (tenantId: string, id: string) => {
      const row = await prisma.staffMember.findFirst({ where: { tenantId, id } });
      return row ? mapStaff(row) : null;
    },
    create: async (tenantId: string, data: Omit<StaffMember, "id">) =>
      mapStaff(await prisma.staffMember.create({ data: { tenantId, ...data, hireDate: new Date(`${data.hireDate}T00:00:00Z`) } })),
    update: async (tenantId: string, id: string, updates: Partial<StaffMember>) => {
      const exists = await prisma.staffMember.findFirst({ where: { tenantId, id } });
      if (!exists) return null;
      const row = await prisma.staffMember.update({
        where: { id },
        data: { ...updates, hireDate: updates.hireDate ? new Date(`${updates.hireDate}T00:00:00Z`) : undefined },
      });
      return mapStaff(row);
    },
    delete: (tenantId: string, id: string) => deleteScoped("staffMember", tenantId, id),
  },
  staffShifts: {
    list: async (tenantId: string, params?: { staffId?: string; from?: Date; to?: Date }) =>
      (
        await prisma.staffShift.findMany({
          where: {
            tenantId,
            ...(params?.staffId ? { staffId: params.staffId } : {}),
            ...(params?.from || params?.to
              ? {
                  clockInAt: {
                    ...(params?.from ? { gte: params.from } : {}),
                    ...(params?.to ? { lte: params.to } : {}),
                  },
                }
              : {}),
          },
          orderBy: { clockInAt: "desc" },
        })
      ).map(mapShift),
    openShiftForStaff: async (tenantId: string, staffId: string) => {
      const row = await prisma.staffShift.findFirst({
        where: { tenantId, staffId, clockOutAt: null },
        orderBy: { clockInAt: "desc" },
      });
      return row ? mapShift(row) : null;
    },
    clockIn: async (tenantId: string, staffId: string, notes?: string) => {
      const open = await prisma.staffShift.findFirst({ where: { tenantId, staffId, clockOutAt: null } });
      if (open) return mapShift(open);
      const row = await prisma.staffShift.create({
        data: { tenantId, staffId, clockInAt: new Date(), notes: notes || "" },
      });
      return mapShift(row);
    },
    clockOut: async (tenantId: string, staffId: string, notes?: string) => {
      const open = await prisma.staffShift.findFirst({
        where: { tenantId, staffId, clockOutAt: null },
        orderBy: { clockInAt: "desc" },
      });
      if (!open) return null;
      const row = await prisma.staffShift.update({
        where: { id: open.id },
        data: {
          clockOutAt: new Date(),
          notes: notes != null && notes.length > 0 ? notes : open.notes,
        },
      });
      return mapShift(row);
    },
  },
  bookings: {
    list: async (tenantId: string) => (await prisma.booking.findMany({ where: { tenantId }, orderBy: { date: "desc" } })).map(mapBooking),
    get: async (tenantId: string, id: string) => {
      const row = await prisma.booking.findFirst({ where: { tenantId, id } });
      return row ? mapBooking(row) : null;
    },
    create: async (tenantId: string, data: Omit<Booking, "id">) =>
      mapBooking(await prisma.booking.create({ data: { tenantId, ...data, status: data.status === "in_attesa" ? "in_attesa" : data.status, date: new Date(`${data.date}T00:00:00Z`) } })),
    update: async (tenantId: string, id: string, updates: Partial<Booking>) => {
      const exists = await prisma.booking.findFirst({ where: { tenantId, id } });
      if (!exists) return null;
      const row = await prisma.booking.update({ where: { id }, data: { ...updates, date: updates.date ? new Date(`${updates.date}T00:00:00Z`) : undefined } });
      return mapBooking(row);
    },
    delete: (tenantId: string, id: string) => deleteScoped("booking", tenantId, id),
  },
  suppliers: {
    list: async (tenantId: string) => (await prisma.supplier.findMany({ where: { tenantId }, orderBy: { name: "asc" } })).map(mapSupplier),
    get: async (tenantId: string, id: string) => {
      const row = await prisma.supplier.findFirst({ where: { tenantId, id } });
      return row ? mapSupplier(row) : null;
    },
    create: async (tenantId: string, data: Omit<Supplier, "id">) => mapSupplier(await prisma.supplier.create({ data: { tenantId, ...data } })),
    update: async (tenantId: string, id: string, updates: Partial<Supplier>) => {
      const exists = await prisma.supplier.findFirst({ where: { tenantId, id } });
      if (!exists) return null;
      return mapSupplier(await prisma.supplier.update({ where: { id }, data: updates }));
    },
    delete: (tenantId: string, id: string) => deleteScoped("supplier", tenantId, id),
  },
  catering: {
    list: async (tenantId: string) => (await prisma.cateringEvent.findMany({ where: { tenantId }, orderBy: { date: "desc" } })).map(mapCatering),
    get: async (tenantId: string, id: string) => {
      const row = await prisma.cateringEvent.findFirst({ where: { tenantId, id } });
      return row ? mapCatering(row) : null;
    },
    create: async (tenantId: string, data: Omit<CateringEvent, "id">) =>
      mapCatering(await prisma.cateringEvent.create({ data: { tenantId, ...data, date: new Date(`${data.date}T00:00:00Z`) } })),
    update: async (tenantId: string, id: string, updates: Partial<CateringEvent>) => {
      const exists = await prisma.cateringEvent.findFirst({ where: { tenantId, id } });
      if (!exists) return null;
      return mapCatering(await prisma.cateringEvent.update({ where: { id }, data: { ...updates, date: updates.date ? new Date(`${updates.date}T00:00:00Z`) : undefined } }));
    },
    delete: (tenantId: string, id: string) => deleteScoped("cateringEvent", tenantId, id),
  },
  asporto: {
    list: async (tenantId: string) => (await prisma.takeawayOrder.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } })).map(mapAsporto),
    get: async (tenantId: string, id: string) => {
      const row = await prisma.takeawayOrder.findFirst({ where: { tenantId, id } });
      return row ? mapAsporto(row) : null;
    },
    create: async (tenantId: string, data: Omit<AsportoOrder, "id">) =>
      mapAsporto(await prisma.takeawayOrder.create({ data: { tenantId, ...data, createdAt: new Date(data.createdAt) } })),
    update: async (tenantId: string, id: string, updates: Partial<AsportoOrder>) => {
      const exists = await prisma.takeawayOrder.findFirst({ where: { tenantId, id } });
      if (!exists) return null;
      return mapAsporto(await prisma.takeawayOrder.update({ where: { id }, data: updates }));
    },
    delete: (tenantId: string, id: string) => deleteScoped("takeawayOrder", tenantId, id),
  },
  archivio: {
    list: async (tenantId: string) => (await prisma.archivedOrder.findMany({ where: { tenantId }, orderBy: { closedAt: "desc" } })).map(mapArchived),
    get: async (tenantId: string, id: string) => {
      const row = await prisma.archivedOrder.findFirst({ where: { tenantId, id } });
      return row ? mapArchived(row) : null;
    },
    create: async (tenantId: string, data: Omit<ArchivedOrder, "id">) =>
      mapArchived(await prisma.archivedOrder.create({
        data: {
          tenantId,
          ...data,
          date: new Date(`${data.date}T00:00:00Z`),
          closedAt: new Date(data.closedAt),
        },
      })),
    update: async (tenantId: string, id: string, updates: Partial<ArchivedOrder>) => {
      const exists = await prisma.archivedOrder.findFirst({ where: { tenantId, id } });
      if (!exists) return null;
      return mapArchived(await prisma.archivedOrder.update({
        where: { id },
        data: {
          ...updates,
          date: updates.date ? new Date(`${updates.date}T00:00:00Z`) : undefined,
          closedAt: updates.closedAt ? new Date(updates.closedAt) : undefined,
        },
      }));
    },
    delete: (tenantId: string, id: string) => deleteScoped("archivedOrder", tenantId, id),
  },
};
