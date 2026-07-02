import { prisma } from "@/lib/db/prisma";
import {
  BOOKING_LIST_STATUSES,
  canEditOnBookingList,
  channelRequiresVoucher,
  defaultStatusForChannel,
} from "@/lib/hotel/booking-list";
import type { HotelBookingChannel, HotelReservation, HotelReservationStatus } from "@/modules/hotel/domain/types";

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
}): HotelReservation {
  return {
    id: row.id,
    customerId: row.customerId,
    guestName: row.guestName,
    phone: row.phone ?? "",
    email: row.email ?? "",
    roomId: row.roomId,
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
    });
    return row ? mapReservation(row) : null;
  },

  async create(tenantId: string, data: Omit<HotelReservation, "id">) {
    validateReservationPayload(data, true);
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
