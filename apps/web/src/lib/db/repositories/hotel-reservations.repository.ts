import { prisma } from "@/lib/db/prisma";
import {
  BOOKING_LIST_STATUSES,
  canEditOnBookingList,
  channelRequiresVoucher,
  defaultStatusForChannel,
} from "@/lib/hotel/booking-list";
import type {
  HotelBookingChannel,
  HotelReservation,
  HotelReservationStatus,
  ReservationGroup,
  ReservationGroupStatus,
} from "@/modules/hotel/domain/types";

function toDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function toDateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

function mapReservation(row: {
  id: string;
  customerId: string;
  guestName: string;
  phone: string | null;
  email: string | null;
  roomId: string | null;
  groupId?: string | null;
  checkInDate: Date;
  checkOutDate: Date;
  guests: number;
  status: HotelReservation["status"];
  roomType: string;
  boardType: HotelReservation["boardType"];
  nights: number;
  rate: { toNumber: () => number };
  documentCode: string | null;
  nationality?: string | null;
  address?: string | null;
  company?: string | null;
  channel?: HotelBookingChannel;
  voucherCode?: string | null;
  children?: number;
  crib?: boolean;
  lateCheckout?: boolean;
  earlyCheckin?: boolean;
  depositReceived?: { toNumber: () => number } | null;
  receptionNotes?: string | null;
  packageName?: string | null;
  ratePlanName?: string | null;
  group?: { name: string } | null;
}): HotelReservation {
  return {
    id: row.id,
    customerId: row.customerId,
    guestName: row.guestName,
    phone: row.phone ?? "",
    email: row.email ?? "",
    roomId: row.roomId,
    groupId: row.groupId ?? null,
    groupName: row.group?.name ?? null,
    checkInDate: toDateString(row.checkInDate),
    checkOutDate: toDateString(row.checkOutDate),
    guests: row.guests,
    status: row.status,
    roomType: row.roomType,
    boardType: row.boardType,
    nights: row.nights,
    rate: row.rate.toNumber(),
    documentCode: row.documentCode ?? "",
    nationality: row.nationality ?? undefined,
    address: row.address ?? undefined,
    company: row.company ?? undefined,
    channel: row.channel ?? "desk",
    voucherCode: row.voucherCode ?? null,
    children: row.children,
    crib: row.crib,
    lateCheckout: row.lateCheckout,
    earlyCheckin: row.earlyCheckin,
    depositReceived: row.depositReceived?.toNumber() ?? null,
    receptionNotes: row.receptionNotes ?? undefined,
    packageName: row.packageName ?? undefined,
    ratePlanName: row.ratePlanName ?? undefined,
  };
}

async function ensureCustomer(params: {
  tenantId: string;
  customerId: string;
  guestName: string;
  email: string;
  phone: string;
}) {
  const existing = await prisma.customer.findFirst({
    where: {
      id: params.customerId,
      tenantId: params.tenantId,
    },
  });
  if (existing) return existing;
  return prisma.customer.create({
    data: {
      id: params.customerId,
      tenantId: params.tenantId,
      name: params.guestName || "Guest",
      email: params.email || null,
      phone: params.phone || null,
    },
  });
}

export type BookingListFilters = {
  status?: HotelReservationStatus | "all";
  channel?: HotelBookingChannel | "all";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  includeCancelled?: boolean;
  page?: number;
  pageSize?: number;
};

export type BookingListStats = {
  total: number;
  inAttesa: number;
  confermata: number;
  cancellata: number;
  noShow: number;
  arrivalsToday: number;
  byChannel: Record<HotelBookingChannel, number>;
};

function buildListWhere(tenantId: string, filters: BookingListFilters) {
  const statuses: HotelReservationStatus[] = filters.includeCancelled
    ? [...BOOKING_LIST_STATUSES]
    : BOOKING_LIST_STATUSES.filter((s) => s !== "cancellata" && s !== "no_show");

  const statusFilter =
    filters.status && filters.status !== "all"
      ? [filters.status]
      : statuses;

  const where = {
    tenantId,
    status: { in: statusFilter },
    ...(filters.channel && filters.channel !== "all" ? { channel: filters.channel } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? {
          checkInDate: {
            ...(filters.dateFrom ? { gte: toDate(filters.dateFrom) } : {}),
            ...(filters.dateTo ? { lte: toDate(filters.dateTo) } : {}),
          },
        }
      : {}),
    ...(filters.search?.trim()
      ? {
          OR: [
            { guestName: { contains: filters.search.trim(), mode: "insensitive" as const } },
            { email: { contains: filters.search.trim(), mode: "insensitive" as const } },
            { phone: { contains: filters.search.trim(), mode: "insensitive" as const } },
            { documentCode: { contains: filters.search.trim(), mode: "insensitive" as const } },
            { voucherCode: { contains: filters.search.trim(), mode: "insensitive" as const } },
            { company: { contains: filters.search.trim(), mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  return where;
}

function validateReservationPayload(data: Partial<HotelReservation>, isCreate: boolean) {
  const channel = data.channel ?? "desk";
  if (channelRequiresVoucher(channel) && !data.voucherCode?.trim()) {
    throw new Error("voucherCode required for voucher bookings");
  }
  if (isCreate && !data.guestName?.trim()) {
    throw new Error("guestName required");
  }
  if (data.status === "in_casa" || data.status === "check_out") {
    throw new Error("Use front desk for check-in/check-out status changes");
  }
  if (data.guests != null && data.guests < 1) {
    throw new Error("guests must be at least 1");
  }
  if (data.children != null && data.children < 0) {
    throw new Error("children cannot be negative");
  }
  if (data.guests != null && data.children != null && data.children >= data.guests) {
    throw new Error("adults must be at least 1 (children >= guests)");
  }
}

async function validateRoomCapacity(tenantId: string, roomId: string | null | undefined, guests: number | undefined) {
  if (!roomId || !guests) return;
  const room = await prisma.hotelRoom.findFirst({
    where: { id: roomId, tenantId },
    select: { capacity: true, code: true },
  });
  if (room && guests > room.capacity) {
    throw new Error(`guests_exceed_capacity:${guests}:${room.capacity}:${room.code}`);
  }
}

function assertEditable(existing: { status: HotelReservationStatus }) {
  if (!canEditOnBookingList(existing.status) && existing.status !== "cancellata" && existing.status !== "no_show") {
    throw new Error("Reservation cannot be edited after check-in");
  }
}

export const hotelReservationsRepository = {
  async all(tenantId: string) {
    const rows = await prisma.hotelReservation.findMany({
      where: { tenantId },
      include: { group: { select: { name: true } } },
      orderBy: [{ checkInDate: "asc" }, { guestName: "asc" }],
    });
    return rows.map(mapReservation);
  },

  async listBookingSheet(tenantId: string, filters: BookingListFilters = {}) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 50));
    const where = buildListWhere(tenantId, filters);
    const today = toDateString(new Date());

    const [rows, total, groupedStatus, groupedChannel, arrivalsToday] = await Promise.all([
      prisma.hotelReservation.findMany({
        where,
        include: { group: { select: { name: true } } },
        orderBy: [{ checkInDate: "asc" }, { guestName: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.hotelReservation.count({ where }),
      prisma.hotelReservation.groupBy({
        by: ["status"],
        where: { tenantId, status: { in: BOOKING_LIST_STATUSES } },
        _count: true,
      }),
      prisma.hotelReservation.groupBy({
        by: ["channel"],
        where: { tenantId, status: { in: BOOKING_LIST_STATUSES.filter((s) => s !== "cancellata" && s !== "no_show") } },
        _count: true,
      }),
      prisma.hotelReservation.count({
        where: {
          tenantId,
          status: { in: ["in_attesa", "confermata"] },
          checkInDate: toDate(today),
        },
      }),
    ]);

    const statusCounts = Object.fromEntries(groupedStatus.map((g) => [g.status, g._count])) as Record<
      string,
      number
    >;
    const channelCounts = Object.fromEntries(groupedChannel.map((g) => [g.channel, g._count])) as Record<
      string,
      number
    >;

    const stats: BookingListStats = {
      total,
      inAttesa: statusCounts.in_attesa ?? 0,
      confermata: statusCounts.confermata ?? 0,
      cancellata: statusCounts.cancellata ?? 0,
      noShow: statusCounts.no_show ?? 0,
      arrivalsToday,
      byChannel: {
        online: channelCounts.online ?? 0,
        desk: channelCounts.desk ?? 0,
        agency: channelCounts.agency ?? 0,
        voucher: channelCounts.voucher ?? 0,
      },
    };

    return {
      items: rows.map(mapReservation),
      total,
      page,
      pageSize,
      stats,
    };
  },

  async get(tenantId: string, id: string) {
    const row = await prisma.hotelReservation.findFirst({
      where: { id, tenantId },
      include: { group: { select: { name: true } } },
    });
    return row ? mapReservation(row) : null;
  },

  async create(tenantId: string, data: Omit<HotelReservation, "id">) {
    validateReservationPayload(data, true);
    await validateRoomCapacity(tenantId, data.roomId, data.guests);
    const channel = data.channel ?? "desk";
    const status = data.status ?? defaultStatusForChannel(channel);

    await ensureCustomer({
      tenantId,
      customerId: data.customerId,
      guestName: data.guestName,
      email: data.email,
      phone: data.phone,
    });
    const row = await prisma.hotelReservation.create({
      data: {
        tenantId,
        customerId: data.customerId,
        roomId: data.roomId,
        groupId: data.groupId || null,
        guestName: data.guestName,
        phone: data.phone || null,
        email: data.email || null,
        checkInDate: toDate(data.checkInDate),
        checkOutDate: toDate(data.checkOutDate),
        guests: data.guests,
        status,
        roomType: data.roomType,
        boardType: data.boardType,
        nights: data.nights,
        rate: data.rate,
        documentCode: data.documentCode || null,
        nationality: data.nationality || null,
        address: data.address || null,
        company: data.company || null,
        channel,
        voucherCode: data.voucherCode?.trim() || null,
        children: data.children ?? 0,
        crib: data.crib ?? false,
        lateCheckout: data.lateCheckout ?? false,
        earlyCheckin: data.earlyCheckin ?? false,
        depositReceived: data.depositReceived ?? null,
        receptionNotes: data.receptionNotes || null,
        packageName: data.packageName || null,
        ratePlanName: data.ratePlanName || null,
      },
      include: { group: { select: { name: true } } },
    });
    return mapReservation(row);
  },

  async update(tenantId: string, id: string, data: Partial<HotelReservation>) {
    const existing = await prisma.hotelReservation.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return null;

    if (existing.status === "in_casa" || existing.status === "check_out") {
      throw new Error("Reservation cannot be edited after check-in");
    }

    if (data.status && (data.status === "in_casa" || data.status === "check_out")) {
      throw new Error("Use front desk for check-in/check-out");
    }

    const nextChannel = (data.channel ?? existing.channel) as HotelBookingChannel;
    const nextVoucher = data.voucherCode !== undefined ? data.voucherCode : existing.voucherCode;
    if (channelRequiresVoucher(nextChannel) && !nextVoucher?.trim()) {
      throw new Error("voucherCode required for voucher bookings");
    }

    if (data.status && data.status !== existing.status) {
      assertEditable(existing);
    } else if (Object.keys(data).length > 0) {
      assertEditable(existing);
    }

    const effectiveRoomId = data.roomId !== undefined ? data.roomId : existing.roomId;
    const effectiveGuests = data.guests ?? existing.guests;
    await validateRoomCapacity(tenantId, effectiveRoomId, effectiveGuests);

    if (data.customerId) {
      await ensureCustomer({
        tenantId,
        customerId: data.customerId,
        guestName: data.guestName ?? existing.guestName,
        email: data.email ?? existing.email ?? "",
        phone: data.phone ?? existing.phone ?? "",
      });
    }

    const row = await prisma.hotelReservation.update({
      where: { id },
      data: {
        customerId: data.customerId,
        roomId: data.roomId === undefined ? undefined : data.roomId,
        groupId: data.groupId === undefined ? undefined : data.groupId || null,
        guestName: data.guestName,
        phone: data.phone === undefined ? undefined : data.phone || null,
        email: data.email === undefined ? undefined : data.email || null,
        checkInDate: data.checkInDate ? toDate(data.checkInDate) : undefined,
        checkOutDate: data.checkOutDate ? toDate(data.checkOutDate) : undefined,
        guests: data.guests,
        status: data.status,
        roomType: data.roomType,
        boardType: data.boardType,
        nights: data.nights,
        rate: data.rate,
        documentCode: data.documentCode === undefined ? undefined : data.documentCode || null,
        nationality: data.nationality === undefined ? undefined : data.nationality || null,
        address: data.address === undefined ? undefined : data.address || null,
        company: data.company === undefined ? undefined : data.company || null,
        channel: data.channel,
        voucherCode: data.voucherCode === undefined ? undefined : data.voucherCode?.trim() || null,
        children: data.children,
        crib: data.crib,
        lateCheckout: data.lateCheckout,
        earlyCheckin: data.earlyCheckin,
        depositReceived: data.depositReceived === undefined ? undefined : data.depositReceived,
        receptionNotes: data.receptionNotes === undefined ? undefined : data.receptionNotes || null,
        packageName: data.packageName === undefined ? undefined : data.packageName || null,
        ratePlanName: data.ratePlanName === undefined ? undefined : data.ratePlanName || null,
      },
      include: { group: { select: { name: true } } },
    });
    return mapReservation(row);
  },

  async delete(tenantId: string, id: string) {
    const existing = await prisma.hotelReservation.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return false;
    if (existing.status === "in_casa" || existing.status === "check_out") {
      throw new Error("Cannot delete checked-in reservation");
    }
    await prisma.hotelReservation.delete({ where: { id } });
    return true;
  },
};

/* ─── Reservation Groups ───────────────────────────── */

function mapGroup(
  row: {
    id: string;
    name: string;
    contactPerson: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    company: string | null;
    checkInDate: Date;
    checkOutDate: Date;
    notes: string | null;
    status: ReservationGroupStatus;
    createdAt: Date;
    updatedAt: Date;
  },
  stats?: { roomCount: number; totalGuests: number },
): ReservationGroup {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contactPerson,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    company: row.company,
    checkInDate: toDateString(row.checkInDate),
    checkOutDate: toDateString(row.checkOutDate),
    notes: row.notes,
    status: row.status,
    roomCount: stats?.roomCount ?? 0,
    totalGuests: stats?.totalGuests ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const reservationGroupsRepository = {
  async list(tenantId: string) {
    const rows = await prisma.reservationGroup.findMany({
      where: { tenantId },
      include: {
        reservations: { select: { id: true, guests: true } },
      },
      orderBy: [{ checkInDate: "asc" }, { name: "asc" }],
    });
    return rows.map((r) =>
      mapGroup(r, {
        roomCount: r.reservations.length,
        totalGuests: r.reservations.reduce((s, rv) => s + rv.guests, 0),
      }),
    );
  },

  async get(tenantId: string, id: string) {
    const row = await prisma.reservationGroup.findFirst({
      where: { id, tenantId },
      include: {
        reservations: { select: { id: true, guests: true } },
      },
    });
    if (!row) return null;
    return mapGroup(row, {
      roomCount: row.reservations.length,
      totalGuests: row.reservations.reduce((s, rv) => s + rv.guests, 0),
    });
  },

  async create(
    tenantId: string,
    data: {
      name: string;
      contactPerson?: string;
      contactEmail?: string;
      contactPhone?: string;
      company?: string;
      checkInDate: string;
      checkOutDate: string;
      notes?: string;
      status?: ReservationGroupStatus;
    },
  ) {
    if (!data.name?.trim()) throw new Error("name required");
    const row = await prisma.reservationGroup.create({
      data: {
        tenantId,
        name: data.name.trim(),
        contactPerson: data.contactPerson?.trim() || null,
        contactEmail: data.contactEmail?.trim() || null,
        contactPhone: data.contactPhone?.trim() || null,
        company: data.company?.trim() || null,
        checkInDate: toDate(data.checkInDate),
        checkOutDate: toDate(data.checkOutDate),
        notes: data.notes?.trim() || null,
        status: data.status ?? "tentative",
      },
    });
    return mapGroup(row, { roomCount: 0, totalGuests: 0 });
  },

  async update(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      contactPerson?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
      company?: string | null;
      checkInDate?: string;
      checkOutDate?: string;
      notes?: string | null;
      status?: ReservationGroupStatus;
    },
  ) {
    const existing = await prisma.reservationGroup.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return null;

    const row = await prisma.reservationGroup.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        contactPerson: data.contactPerson === undefined ? undefined : data.contactPerson?.trim() || null,
        contactEmail: data.contactEmail === undefined ? undefined : data.contactEmail?.trim() || null,
        contactPhone: data.contactPhone === undefined ? undefined : data.contactPhone?.trim() || null,
        company: data.company === undefined ? undefined : data.company?.trim() || null,
        checkInDate: data.checkInDate ? toDate(data.checkInDate) : undefined,
        checkOutDate: data.checkOutDate ? toDate(data.checkOutDate) : undefined,
        notes: data.notes === undefined ? undefined : data.notes?.trim() || null,
        status: data.status,
      },
      include: { reservations: { select: { id: true, guests: true } } },
    });
    return mapGroup(row, {
      roomCount: row.reservations.length,
      totalGuests: row.reservations.reduce((s, rv) => s + rv.guests, 0),
    });
  },

  async delete(tenantId: string, id: string) {
    const existing = await prisma.reservationGroup.findFirst({
      where: { id, tenantId },
      include: { reservations: { select: { id: true } } },
    });
    if (!existing) return false;
    if (existing.reservations.length > 0) {
      await prisma.hotelReservation.updateMany({
        where: { groupId: id, tenantId },
        data: { groupId: null },
      });
    }
    await prisma.reservationGroup.delete({ where: { id } });
    return true;
  },
};
