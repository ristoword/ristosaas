import type {
  GuestRegisterAttachmentType,
  GuestRegisterCountry,
  GuestRegisterDocumentType,
  GuestRegisterEntryStatus,
  GuestRegisterOcrStatus,
  GuestRegisterPersonSex,
  GuestRegisterTransmissionStatus,
} from "@/modules/hotel/domain/guest-register-types";
import type {
  GuestRegisterAttachmentType as PrismaAttachmentType,
  GuestRegisterCountry as PrismaCountry,
  GuestRegisterDocumentType as PrismaDocType,
  GuestRegisterEntryStatus as PrismaEntryStatus,
  GuestRegisterOcrStatus as PrismaOcrStatus,
  GuestRegisterPersonSex as PrismaSex,
  GuestRegisterTransmissionStatus as PrismaTxStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { decryptDocument, encryptDocument } from "@/lib/hotel/guest-register-crypto";
import type {
  GuestRegisterAttachmentMeta,
  GuestRegisterAuditLog,
  GuestRegisterDashboard,
  GuestRegisterEntry,
  GuestRegisterEntryDetail,
  GuestRegisterPerson,
  GuestRegisterSearchParams,
  GuestRegisterSearchResult,
  GuestRegisterTransmission,
} from "@/modules/hotel/domain/guest-register-types";

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

function toIso(d: Date | null | undefined) {
  return d ? d.toISOString() : null;
}

function mapPerson(row: {
  id: string;
  entryId: string;
  firstName: string;
  lastName: string;
  sex: PrismaSex;
  dateOfBirth: Date | null;
  placeOfBirth: string | null;
  stateOfBirth: string | null;
  nationality: string | null;
  residenceCountry: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  taxCode: string | null;
  phone: string | null;
  email: string | null;
  documentType: PrismaDocType | null;
  documentNumber: string | null;
  documentIssueDate: Date | null;
  documentExpiryDate: Date | null;
  documentIssuingAuthority: string | null;
  isPrimary: boolean;
  sortOrder: number;
  isComplete: boolean;
  ocrStatus: PrismaOcrStatus;
  ocrPayload: Prisma.JsonValue | null;
  ocrVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): GuestRegisterPerson {
  return {
    id: row.id,
    entryId: row.entryId,
    firstName: row.firstName,
    lastName: row.lastName,
    sex: row.sex as GuestRegisterPersonSex,
    dateOfBirth: toIso(row.dateOfBirth),
    placeOfBirth: row.placeOfBirth,
    stateOfBirth: row.stateOfBirth,
    nationality: row.nationality,
    residenceCountry: row.residenceCountry,
    address: row.address,
    postalCode: row.postalCode,
    city: row.city,
    province: row.province,
    taxCode: row.taxCode,
    phone: row.phone,
    email: row.email,
    documentType: row.documentType as GuestRegisterDocumentType | null,
    documentNumber: row.documentNumber,
    documentIssueDate: toIso(row.documentIssueDate),
    documentExpiryDate: toIso(row.documentExpiryDate),
    documentIssuingAuthority: row.documentIssuingAuthority,
    isPrimary: row.isPrimary,
    sortOrder: row.sortOrder,
    isComplete: row.isComplete,
    ocrStatus: row.ocrStatus as GuestRegisterOcrStatus,
    ocrPayload: row.ocrPayload as Record<string, unknown> | null,
    ocrVerifiedAt: toIso(row.ocrVerifiedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapEntry(row: {
  id: string;
  tenantId: string;
  reservationId: string;
  stayId: string | null;
  roomId: string | null;
  status: PrismaEntryStatus;
  transmissionStatus: PrismaTxStatus;
  transmissionCountry: PrismaCountry;
  arrivalDate: Date;
  departureDate: Date;
  guestCount: number;
  adults: number;
  children: number;
  roomCode: string | null;
  notes: string | null;
  lastTransmissionAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  reservation?: { guestName: string; status: string } | null;
}): GuestRegisterEntry {
  return {
    id: row.id,
    tenantId: row.tenantId,
    reservationId: row.reservationId,
    stayId: row.stayId,
    roomId: row.roomId,
    status: row.status as GuestRegisterEntryStatus,
    transmissionStatus: row.transmissionStatus as GuestRegisterTransmissionStatus,
    transmissionCountry: row.transmissionCountry as GuestRegisterCountry,
    arrivalDate: toDateString(row.arrivalDate),
    departureDate: toDateString(row.departureDate),
    guestCount: row.guestCount,
    adults: row.adults,
    children: row.children,
    roomCode: row.roomCode,
    notes: row.notes,
    lastTransmissionAt: toIso(row.lastTransmissionAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    guestName: row.reservation?.guestName ?? null,
    reservationStatus: row.reservation?.status ?? null,
  };
}

function mapAttachment(row: {
  id: string;
  entryId: string;
  personId: string | null;
  type: PrismaAttachmentType;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
}): GuestRegisterAttachmentMeta {
  return {
    id: row.id,
    entryId: row.entryId,
    personId: row.personId,
    type: row.type as GuestRegisterAttachmentType,
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapTransmission(row: {
  id: string;
  entryId: string;
  country: PrismaCountry;
  adapterCode: string;
  status: PrismaTxStatus;
  requestPayload: Prisma.JsonValue | null;
  responsePayload: Prisma.JsonValue | null;
  errorMessage: string | null;
  externalRef: string | null;
  sentAt: Date | null;
  createdAt: Date;
}): GuestRegisterTransmission {
  return {
    id: row.id,
    entryId: row.entryId,
    country: row.country as GuestRegisterCountry,
    adapterCode: row.adapterCode,
    status: row.status as GuestRegisterTransmissionStatus,
    requestPayload: row.requestPayload as Record<string, unknown> | null,
    responsePayload: row.responsePayload as Record<string, unknown> | null,
    errorMessage: row.errorMessage,
    externalRef: row.externalRef,
    sentAt: toIso(row.sentAt),
    createdAt: row.createdAt.toISOString(),
  };
}

function mapAudit(row: {
  id: string;
  entryId: string | null;
  personId: string | null;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  userName: string | null;
  ip: string | null;
  createdAt: Date;
}): GuestRegisterAuditLog {
  return {
    id: row.id,
    entryId: row.entryId,
    personId: row.personId,
    action: row.action,
    field: row.field,
    oldValue: row.oldValue,
    newValue: row.newValue,
    userName: row.userName,
    ip: row.ip,
    createdAt: row.createdAt.toISOString(),
  };
}

export type RegisterActor = {
  userId?: string;
  userName?: string;
  ip?: string;
  userAgent?: string;
  device?: string;
};

export function actorFromRequest(
  user: { id?: string; username?: string; name?: string } | null | undefined,
  headers: Headers,
): RegisterActor {
  return {
    userId: user?.id,
    userName: user?.username || user?.name || "operator",
    ip: headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || undefined,
    userAgent: headers.get("user-agent") || undefined,
    device: headers.get("sec-ch-ua-platform") || undefined,
  };
}

async function writeAudit(
  params: {
    tenantId: string;
    entryId?: string;
    personId?: string;
    action: string;
    field?: string;
    oldValue?: string;
    newValue?: string;
    actor?: RegisterActor;
  },
  tx: Prisma.TransactionClient = prisma,
) {
  await tx.guestRegisterAuditLog.create({
    data: {
      tenantId: params.tenantId,
      entryId: params.entryId ?? null,
      personId: params.personId ?? null,
      userId: params.actor?.userId ?? null,
      userName: params.actor?.userName ?? null,
      action: params.action,
      field: params.field ?? null,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
      ip: params.actor?.ip ?? null,
      userAgent: params.actor?.userAgent ?? null,
      device: params.actor?.device ?? null,
    },
  });
}

async function writeAccessLog(
  params: {
    tenantId: string;
    entryId?: string;
    personId?: string;
    action: string;
    actor?: RegisterActor;
  },
  tx: Prisma.TransactionClient = prisma,
) {
  await tx.guestRegisterAccessLog.create({
    data: {
      tenantId: params.tenantId,
      entryId: params.entryId ?? null,
      personId: params.personId ?? null,
      userId: params.actor?.userId ?? null,
      userName: params.actor?.userName ?? null,
      action: params.action,
      ip: params.actor?.ip ?? null,
      userAgent: params.actor?.userAgent ?? null,
    },
  });
}

function splitGuestName(guestName: string): { firstName: string; lastName: string } {
  const parts = guestName.trim().split(/\s+/);
  if (parts.length <= 1) return { firstName: parts[0] || "", lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

function computePersonComplete(p: {
  firstName: string;
  lastName: string;
  nationality: string | null;
  documentNumber: string | null;
  documentType: PrismaDocType | null;
  dateOfBirth: Date | null;
}): boolean {
  return Boolean(
    p.firstName.trim() &&
      p.lastName.trim() &&
      p.nationality?.trim() &&
      p.documentNumber?.trim() &&
      p.documentType &&
      p.dateOfBirth,
  );
}

function computeEntryStatus(persons: { isComplete: boolean }[], reservationStatus: string): GuestRegisterEntryStatus {
  if (reservationStatus === "check_out") return "checked_out";
  if (persons.length === 0) return "draft";
  if (persons.every((p) => p.isComplete)) return "complete";
  if (persons.some((p) => p.isComplete)) return "incomplete";
  return "draft";
}

export const guestRegisterRepository = {
  async dashboard(tenantId: string, dateIso: string): Promise<GuestRegisterDashboard> {
    const dayStart = new Date(`${dateIso}T00:00:00Z`);
    const dayEnd = new Date(`${dateIso}T23:59:59Z`);

    const [arrivalsToday, departuresToday, guestsPresent, toRegister, incomplete, sent, transmissionErrors, nationalityRows, statusRows, txRows] =
      await Promise.all([
        prisma.guestRegisterEntry.count({
          where: { tenantId, arrivalDate: { gte: dayStart, lte: dayEnd } },
        }),
        prisma.guestRegisterEntry.count({
          where: { tenantId, departureDate: { gte: dayStart, lte: dayEnd } },
        }),
        prisma.guestRegisterEntry.count({
          where: { tenantId, status: { in: ["incomplete", "complete"] }, reservation: { status: "in_casa" } },
        }),
        prisma.guestRegisterEntry.count({
          where: { tenantId, status: { in: ["draft", "incomplete"] }, reservation: { status: "in_casa" } },
        }),
        prisma.guestRegisterEntry.count({ where: { tenantId, status: "incomplete" } }),
        prisma.guestRegisterEntry.count({ where: { tenantId, transmissionStatus: "sent" } }),
        prisma.guestRegisterEntry.count({ where: { tenantId, transmissionStatus: "error" } }),
        prisma.guestRegisterPerson.groupBy({
          by: ["nationality"],
          where: { tenantId, entry: { reservation: { status: "in_casa" } }, nationality: { not: null } },
          _count: { id: true },
        }),
        prisma.guestRegisterEntry.groupBy({
          by: ["status"],
          where: { tenantId },
          _count: { id: true },
        }),
        prisma.guestRegisterEntry.groupBy({
          by: ["transmissionStatus"],
          where: { tenantId },
          _count: { id: true },
        }),
      ]);

    return {
      date: dateIso,
      arrivalsToday,
      departuresToday,
      guestsPresent,
      toRegister,
      incomplete,
      sent,
      transmissionErrors,
      nationalityBreakdown: nationalityRows
        .map((r) => ({ nationality: r.nationality || "—", count: r._count.id }))
        .sort((a, b) => b.count - a.count),
      statusBreakdown: statusRows.map((r) => ({
        status: r.status as GuestRegisterEntryStatus,
        count: r._count.id,
      })),
      transmissionBreakdown: txRows.map((r) => ({
        status: r.transmissionStatus as GuestRegisterTransmissionStatus,
        count: r._count.id,
      })),
    };
  },

  async search(tenantId: string, params: GuestRegisterSearchParams): Promise<GuestRegisterSearchResult> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(10, params.pageSize ?? 25));
    const skip = (page - 1) * pageSize;

    const where: Prisma.GuestRegisterEntryWhereInput = { tenantId };

    if (params.status) where.status = params.status;
    if (params.transmissionStatus) where.transmissionStatus = params.transmissionStatus;
    if (params.roomCode) where.roomCode = { contains: params.roomCode, mode: "insensitive" };
    if (params.arrivalFrom || params.arrivalTo) {
      where.arrivalDate = {};
      if (params.arrivalFrom) where.arrivalDate.gte = new Date(`${params.arrivalFrom}T00:00:00Z`);
      if (params.arrivalTo) where.arrivalDate.lte = new Date(`${params.arrivalTo}T23:59:59Z`);
    }
    if (params.departureFrom || params.departureTo) {
      where.departureDate = {};
      if (params.departureFrom) where.departureDate.gte = new Date(`${params.departureFrom}T00:00:00Z`);
      if (params.departureTo) where.departureDate.lte = new Date(`${params.departureTo}T23:59:59Z`);
    }

    const personFilter: Prisma.GuestRegisterPersonWhereInput = {};
    if (params.firstName) personFilter.firstName = { contains: params.firstName, mode: "insensitive" };
    if (params.lastName) personFilter.lastName = { contains: params.lastName, mode: "insensitive" };
    if (params.documentNumber) personFilter.documentNumber = { contains: params.documentNumber, mode: "insensitive" };
    if (params.nationality) personFilter.nationality = { contains: params.nationality, mode: "insensitive" };

    if (params.query) {
      const q = params.query.trim();
      where.OR = [
        { roomCode: { contains: q, mode: "insensitive" } },
        { reservation: { guestName: { contains: q, mode: "insensitive" } } },
        { persons: { some: { OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { documentNumber: { contains: q, mode: "insensitive" } },
        ] } } },
      ];
    } else if (Object.keys(personFilter).length > 0) {
      where.persons = { some: personFilter };
    }

    const [rows, total] = await Promise.all([
      prisma.guestRegisterEntry.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ arrivalDate: "desc" }, { updatedAt: "desc" }],
        include: { reservation: { select: { guestName: true, status: true } } },
      }),
      prisma.guestRegisterEntry.count({ where }),
    ]);

    return { items: rows.map(mapEntry), total, page, pageSize };
  },

  async getDetail(tenantId: string, entryId: string, actor?: RegisterActor): Promise<GuestRegisterEntryDetail | null> {
    const row = await prisma.guestRegisterEntry.findFirst({
      where: { id: entryId, tenantId },
      include: {
        reservation: { select: { guestName: true, status: true } },
        persons: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
        attachments: { orderBy: { createdAt: "desc" }, select: { id: true, entryId: true, personId: true, type: true, fileName: true, mimeType: true, fileSize: true, createdAt: true } },
        transmissions: { orderBy: { createdAt: "desc" }, take: 50 },
        auditLogs: { orderBy: { createdAt: "desc" }, take: 100 },
      },
    });
    if (!row) return null;

    if (actor) {
      await writeAccessLog({ tenantId, entryId, action: "view", actor });
    }

    return {
      ...mapEntry(row),
      persons: row.persons.map(mapPerson),
      attachments: row.attachments.map(mapAttachment),
      transmissions: row.transmissions.map(mapTransmission),
      auditLogs: row.auditLogs.map(mapAudit),
    };
  },

  async upsertFromReservation(params: {
    tenantId: string;
    reservationId: string;
    stayId?: string | null;
    roomId?: string | null;
    roomCode?: string | null;
    actor?: RegisterActor;
  }) {
    const reservation = await prisma.hotelReservation.findFirst({
      where: { id: params.reservationId, tenantId: params.tenantId },
      include: { room: { select: { code: true } } },
    });
    if (!reservation) throw new Error("Prenotazione non trovata");

    const { firstName, lastName } = splitGuestName(reservation.guestName);
    const adults = Math.max(1, reservation.guests - reservation.children);

    const entry = await prisma.$transaction(async (tx) => {
      const existing = await tx.guestRegisterEntry.findUnique({
        where: { reservationId: reservation.id },
        include: { persons: true },
      });

      if (existing) {
        const updated = await tx.guestRegisterEntry.update({
          where: { id: existing.id },
          data: {
            stayId: params.stayId ?? existing.stayId,
            roomId: params.roomId ?? reservation.roomId ?? existing.roomId,
            roomCode: params.roomCode ?? reservation.room?.code ?? existing.roomCode,
            arrivalDate: reservation.checkInDate,
            departureDate: reservation.checkOutDate,
            guestCount: reservation.guests,
            adults,
            children: reservation.children,
          },
          include: { reservation: { select: { guestName: true, status: true } }, persons: true },
        });
        return updated;
      }

      const created = await tx.guestRegisterEntry.create({
        data: {
          tenantId: params.tenantId,
          reservationId: reservation.id,
          stayId: params.stayId ?? null,
          roomId: params.roomId ?? reservation.roomId,
          roomCode: params.roomCode ?? reservation.room?.code ?? null,
          arrivalDate: reservation.checkInDate,
          departureDate: reservation.checkOutDate,
          guestCount: reservation.guests,
          adults,
          children: reservation.children,
          status: "draft",
          transmissionCountry: "IT",
        },
        include: { reservation: { select: { guestName: true, status: true } }, persons: true },
      });

      await tx.guestRegisterPerson.create({
        data: {
          tenantId: params.tenantId,
          entryId: created.id,
          firstName,
          lastName,
          isPrimary: true,
          sortOrder: 0,
          nationality: reservation.nationality,
          address: reservation.address,
          phone: reservation.phone,
          email: reservation.email,
          documentNumber: reservation.documentCode,
          documentType: reservation.documentCode ? "identity_card" : null,
        },
      });

      await writeAudit(
        { tenantId: params.tenantId, entryId: created.id, action: "entry_created", newValue: reservation.id, actor: params.actor },
        tx,
      );

      return { ...created, persons: await tx.guestRegisterPerson.findMany({ where: { entryId: created.id } }) };
    });

    return mapEntry(entry);
  },

  async markCheckedOut(tenantId: string, reservationId: string, actor?: RegisterActor) {
    const entry = await prisma.guestRegisterEntry.findFirst({ where: { tenantId, reservationId } });
    if (!entry) return null;
    await prisma.$transaction(async (tx) => {
      await tx.guestRegisterEntry.update({
        where: { id: entry.id },
        data: { status: "checked_out" },
      });
      await writeAudit({ tenantId, entryId: entry.id, action: "entry_checked_out", actor }, tx);
    });
    return true;
  },

  async updateEntry(
    tenantId: string,
    entryId: string,
    data: Partial<{ transmissionCountry: GuestRegisterCountry; notes: string | null; status: GuestRegisterEntryStatus }>,
    actor?: RegisterActor,
  ) {
    const row = await prisma.guestRegisterEntry.update({
      where: { id: entryId, tenantId },
      data: {
        transmissionCountry: data.transmissionCountry,
        notes: data.notes,
        status: data.status,
      },
      include: { reservation: { select: { guestName: true, status: true } } },
    });
    await writeAudit({ tenantId, entryId, action: "entry_updated", newValue: JSON.stringify(data), actor });
    return mapEntry(row);
  },

  async addPerson(
    tenantId: string,
    entryId: string,
    data: Partial<GuestRegisterPerson>,
    actor?: RegisterActor,
  ) {
    const entry = await prisma.guestRegisterEntry.findFirst({ where: { id: entryId, tenantId } });
    if (!entry) throw new Error("Registrazione non trovata");

    const count = await prisma.guestRegisterPerson.count({ where: { entryId } });
    const row = await prisma.guestRegisterPerson.create({
      data: {
        tenantId,
        entryId,
        firstName: data.firstName ?? "",
        lastName: data.lastName ?? "",
        sex: (data.sex as PrismaSex) ?? "unknown",
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        placeOfBirth: data.placeOfBirth ?? null,
        stateOfBirth: data.stateOfBirth ?? null,
        nationality: data.nationality ?? null,
        residenceCountry: data.residenceCountry ?? null,
        address: data.address ?? null,
        postalCode: data.postalCode ?? null,
        city: data.city ?? null,
        province: data.province ?? null,
        taxCode: data.taxCode ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        documentType: (data.documentType as PrismaDocType) ?? null,
        documentNumber: data.documentNumber ?? null,
        documentIssueDate: data.documentIssueDate ? new Date(data.documentIssueDate) : null,
        documentExpiryDate: data.documentExpiryDate ? new Date(data.documentExpiryDate) : null,
        documentIssuingAuthority: data.documentIssuingAuthority ?? null,
        isPrimary: data.isPrimary ?? false,
        sortOrder: data.sortOrder ?? count,
      },
    });

    const isComplete = computePersonComplete(row);
    const updated = await prisma.guestRegisterPerson.update({
      where: { id: row.id },
      data: { isComplete },
    });

    await this.refreshEntryStatus(tenantId, entryId);
    await writeAudit({ tenantId, entryId, personId: row.id, action: "person_added", actor });
    return mapPerson(updated);
  },

  async updatePerson(tenantId: string, personId: string, data: Partial<GuestRegisterPerson>, actor?: RegisterActor) {
    const existing = await prisma.guestRegisterPerson.findFirst({ where: { id: personId, tenantId } });
    if (!existing) throw new Error("Ospite non trovato");

    const row = await prisma.guestRegisterPerson.update({
      where: { id: personId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        sex: data.sex as PrismaSex | undefined,
        dateOfBirth: data.dateOfBirth === undefined ? undefined : data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        placeOfBirth: data.placeOfBirth,
        stateOfBirth: data.stateOfBirth,
        nationality: data.nationality,
        residenceCountry: data.residenceCountry,
        address: data.address,
        postalCode: data.postalCode,
        city: data.city,
        province: data.province,
        taxCode: data.taxCode,
        phone: data.phone,
        email: data.email,
        documentType: data.documentType as PrismaDocType | undefined,
        documentNumber: data.documentNumber,
        documentIssueDate: data.documentIssueDate === undefined ? undefined : data.documentIssueDate ? new Date(data.documentIssueDate) : null,
        documentExpiryDate: data.documentExpiryDate === undefined ? undefined : data.documentExpiryDate ? new Date(data.documentExpiryDate) : null,
        documentIssuingAuthority: data.documentIssuingAuthority,
        isPrimary: data.isPrimary,
        sortOrder: data.sortOrder,
        ocrStatus: data.ocrStatus as PrismaOcrStatus | undefined,
        ocrPayload: data.ocrPayload as Prisma.InputJsonValue | undefined,
        ocrVerifiedAt: data.ocrVerifiedAt ? new Date(data.ocrVerifiedAt) : undefined,
      },
    });

    const isComplete = computePersonComplete(row);
    const updated = await prisma.guestRegisterPerson.update({ where: { id: personId }, data: { isComplete } });
    await this.refreshEntryStatus(tenantId, existing.entryId);
    await writeAudit({ tenantId, entryId: existing.entryId, personId, action: "person_updated", actor });
    return mapPerson(updated);
  },

  async deletePerson(tenantId: string, personId: string, actor?: RegisterActor) {
    const existing = await prisma.guestRegisterPerson.findFirst({ where: { id: personId, tenantId } });
    if (!existing) throw new Error("Ospite non trovato");
    await prisma.guestRegisterPerson.delete({ where: { id: personId } });
    await this.refreshEntryStatus(tenantId, existing.entryId);
    await writeAudit({ tenantId, entryId: existing.entryId, personId, action: "person_deleted", actor });
  },

  async refreshEntryStatus(tenantId: string, entryId: string) {
    const entry = await prisma.guestRegisterEntry.findFirst({
      where: { id: entryId, tenantId },
      include: { persons: true, reservation: { select: { status: true } } },
    });
    if (!entry) return;
    const status = computeEntryStatus(entry.persons, entry.reservation.status);
    await prisma.guestRegisterEntry.update({ where: { id: entryId }, data: { status } });
  },

  async saveAttachment(params: {
    tenantId: string;
    entryId: string;
    personId?: string | null;
    type: GuestRegisterAttachmentType;
    fileName: string;
    mimeType: string;
    dataBase64: string;
    actor?: RegisterActor;
  }) {
    const raw = params.dataBase64.includes(",") ? params.dataBase64.split(",")[1]! : params.dataBase64;
    const fileSize = Math.ceil((raw.length * 3) / 4);
    const { iv, encrypted } = encryptDocument(raw);

    const row = await prisma.guestRegisterAttachment.create({
      data: {
        tenantId: params.tenantId,
        entryId: params.entryId,
        personId: params.personId ?? null,
        type: params.type as PrismaAttachmentType,
        fileName: params.fileName,
        mimeType: params.mimeType,
        fileSize,
        encryptionIv: iv,
        encryptedData: encrypted,
        uploadedByUserId: params.actor?.userId ?? null,
        uploadedByName: params.actor?.userName ?? null,
      },
    });

    await writeAudit({
      tenantId: params.tenantId,
      entryId: params.entryId,
      personId: params.personId ?? undefined,
      action: "attachment_uploaded",
      newValue: params.fileName,
      actor: params.actor,
    });

    return mapAttachment(row);
  },

  async getAttachmentDecrypted(tenantId: string, attachmentId: string, actor?: RegisterActor) {
    const row = await prisma.guestRegisterAttachment.findFirst({ where: { id: attachmentId, tenantId } });
    if (!row) return null;
    const dataBase64 = decryptDocument(row.encryptionIv, row.encryptedData);
    if (actor) {
      await writeAccessLog({ tenantId, entryId: row.entryId, personId: row.personId ?? undefined, action: "download", actor });
    }
    return { meta: mapAttachment(row), dataBase64 };
  },

  async syncToday(tenantId: string, dateIso: string, actor?: RegisterActor) {
    const dayStart = new Date(`${dateIso}T00:00:00Z`);
    const dayEnd = new Date(`${dateIso}T23:59:59Z`);
    const reservations = await prisma.hotelReservation.findMany({
      where: {
        tenantId,
        OR: [
          { checkInDate: { gte: dayStart, lte: dayEnd } },
          { status: "in_casa" },
        ],
      },
      include: { stay: true, room: { select: { id: true, code: true } } },
    });

    const results = [];
    for (const r of reservations) {
      const entry = await this.upsertFromReservation({
        tenantId,
        reservationId: r.id,
        stayId: r.stay?.id,
        roomId: r.roomId,
        roomCode: r.room?.code,
        actor,
      });
      results.push(entry);
    }
    return results;
  },

  writeAudit,
  writeAccessLog,

  async transmitEntry(tenantId: string, entryId: string, country?: GuestRegisterCountry, actor?: RegisterActor) {
    const detail = await this.getDetail(tenantId, entryId);
    if (!detail) throw new Error("Registrazione non trovata");

    const targetCountry = country ?? detail.transmissionCountry;
    const { transmitToAuthority } = await import("@/lib/hotel/guest-register-transmission/registry");
    const result = await transmitToAuthority(targetCountry, { entry: detail, tenantId });

    const status = result.success ? "sent" : "error";
    const tx = await prisma.$transaction(async (txClient) => {
      const transmission = await txClient.guestRegisterTransmission.create({
        data: {
          tenantId,
          entryId,
          country: targetCountry,
          adapterCode: result.adapterCode,
          status,
          requestPayload: { entryId, country: targetCountry } as Prisma.InputJsonValue,
          responsePayload: result.responsePayload
            ? (result.responsePayload as Prisma.InputJsonValue)
            : undefined,
          errorMessage: result.errorMessage ?? null,
          externalRef: result.externalRef ?? null,
          sentAt: result.success ? new Date() : null,
        },
      });

      await txClient.guestRegisterEntry.update({
        where: { id: entryId },
        data: {
          transmissionStatus: status,
          transmissionCountry: targetCountry,
          lastTransmissionAt: result.success ? new Date() : undefined,
        },
      });

      await writeAudit(
        {
          tenantId,
          entryId,
          action: result.success ? "transmission_sent" : "transmission_error",
          newValue: result.externalRef ?? result.errorMessage ?? undefined,
          actor,
        },
        txClient,
      );

      return transmission;
    });

    return mapTransmission(tx);
  },
};
