import { prisma } from "@/lib/db/prisma";
import type { HotelReservation } from "@/modules/hotel/domain/types";

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

export const hotelReservationsRepository = {
  async all(tenantId: string) {
    const rows = await prisma.hotelReservation.findMany({
      where: { tenantId },
      orderBy: [{ checkInDate: "asc" }, { guestName: "asc" }],
    });
    return rows.map(mapReservation);
  },
  async get(tenantId: string, id: string) {
    const row = await prisma.hotelReservation.findFirst({
      where: { id, tenantId },
    });
    return row ? mapReservation(row) : null;
  },
  async create(tenantId: string, data: Omit<HotelReservation, "id">) {
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
        status: data.status,
        roomType: data.roomType,
        boardType: data.boardType,
        nights: data.nights,
        rate: data.rate,
        documentCode: data.documentCode || null,
      },
    });
    return mapReservation(row);
  },
  async update(tenantId: string, id: string, data: Partial<HotelReservation>) {
    const existing = await prisma.hotelReservation.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return null;

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
      },
    });
    return mapReservation(row);
  },
  async delete(tenantId: string, id: string) {
    const existing = await prisma.hotelReservation.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return false;
    await prisma.hotelReservation.delete({ where: { id } });
    return true;
  },
};
