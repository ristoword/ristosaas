import { prisma } from "@/lib/db/prisma";
import type {
  HrCandidate,
  HrCandidateAttachmentMeta,
  HrCandidateSource,
  HrCandidateStatus,
} from "@/lib/api-client";

type CandidateRow = {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: number | null;
  experienceYears: number | null;
  roles: string[];
  status: string;
  source: string;
  sourceEmailFrom: string;
  sourceEmailSubject: string;
  sourceEmailBody: string;
  presentedAt: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  attachments?: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    createdAt: Date;
  }>;
  _count?: { attachments: number };
};

function mapAttachmentMeta(row: {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
}): HrCandidateAttachmentMeta {
  return {
    id: row.id,
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapCandidate(row: CandidateRow): HrCandidate {
  const attachments = row.attachments?.map(mapAttachmentMeta) ?? [];
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: `${row.firstName} ${row.lastName}`.trim(),
    email: row.email,
    phone: row.phone,
    age: row.age,
    experienceYears: row.experienceYears,
    roles: row.roles,
    status: row.status as HrCandidateStatus,
    source: row.source as HrCandidateSource,
    sourceEmailFrom: row.sourceEmailFrom,
    sourceEmailSubject: row.sourceEmailSubject,
    sourceEmailBody: row.sourceEmailBody,
    presentedAt: row.presentedAt.toISOString().slice(0, 10),
    notes: row.notes,
    attachmentCount: row._count?.attachments ?? attachments.length,
    attachments,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type HrCandidateInput = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  age?: number | null;
  experienceYears?: number | null;
  roles?: string[];
  status?: HrCandidateStatus;
  source?: HrCandidateSource;
  sourceEmailFrom?: string;
  sourceEmailSubject?: string;
  sourceEmailBody?: string;
  presentedAt?: string;
  notes?: string;
};

export const hrCandidatesRepository = {
  async all(tenantId: string) {
    const rows = await prisma.hrCandidate.findMany({
      where: { tenantId },
      orderBy: [{ presentedAt: "desc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { attachments: true } },
        attachments: {
          select: { id: true, fileName: true, mimeType: true, fileSize: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return rows.map(mapCandidate);
  },

  async get(tenantId: string, id: string) {
    const row = await prisma.hrCandidate.findFirst({
      where: { tenantId, id },
      include: {
        _count: { select: { attachments: true } },
        attachments: {
          select: { id: true, fileName: true, mimeType: true, fileSize: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return row ? mapCandidate(row) : null;
  },

  async create(tenantId: string, data: HrCandidateInput) {
    const row = await prisma.hrCandidate.create({
      data: {
        tenantId,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email?.trim() ?? "",
        phone: data.phone?.trim() ?? "",
        age: data.age ?? null,
        experienceYears: data.experienceYears ?? null,
        roles: data.roles ?? [],
        status: data.status ?? "new",
        source: data.source ?? "manual",
        sourceEmailFrom: data.sourceEmailFrom?.trim() ?? "",
        sourceEmailSubject: data.sourceEmailSubject?.trim() ?? "",
        sourceEmailBody: data.sourceEmailBody?.trim() ?? "",
        presentedAt: data.presentedAt
          ? new Date(`${data.presentedAt}T12:00:00`)
          : new Date(),
        notes: data.notes?.trim() ?? "",
      },
      include: {
        _count: { select: { attachments: true } },
        attachments: true,
      },
    });
    return mapCandidate(row);
  },

  async update(tenantId: string, id: string, data: Partial<HrCandidateInput>) {
    const exists = await prisma.hrCandidate.findFirst({ where: { tenantId, id } });
    if (!exists) return null;
    const row = await prisma.hrCandidate.update({
      where: { id },
      data: {
        firstName: data.firstName?.trim(),
        lastName: data.lastName?.trim(),
        email: data.email === undefined ? undefined : data.email.trim(),
        phone: data.phone === undefined ? undefined : data.phone.trim(),
        age: data.age === undefined ? undefined : data.age,
        experienceYears: data.experienceYears === undefined ? undefined : data.experienceYears,
        roles: data.roles,
        status: data.status,
        source: data.source,
        sourceEmailFrom: data.sourceEmailFrom === undefined ? undefined : data.sourceEmailFrom.trim(),
        sourceEmailSubject:
          data.sourceEmailSubject === undefined ? undefined : data.sourceEmailSubject.trim(),
        sourceEmailBody: data.sourceEmailBody === undefined ? undefined : data.sourceEmailBody.trim(),
        presentedAt: data.presentedAt
          ? new Date(`${data.presentedAt}T12:00:00`)
          : undefined,
        notes: data.notes === undefined ? undefined : data.notes.trim(),
      },
      include: {
        _count: { select: { attachments: true } },
        attachments: {
          select: { id: true, fileName: true, mimeType: true, fileSize: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return mapCandidate(row);
  },

  async delete(tenantId: string, id: string) {
    const exists = await prisma.hrCandidate.findFirst({ where: { tenantId, id } });
    if (!exists) return false;
    await prisma.hrCandidate.delete({ where: { id } });
    return true;
  },

  async addAttachment(
    tenantId: string,
    candidateId: string,
    data: {
      fileName: string;
      mimeType: string;
      fileSize: number;
      dataBase64: string;
      uploadedByUserId?: string;
      uploadedByName?: string;
    },
  ) {
    const candidate = await prisma.hrCandidate.findFirst({ where: { tenantId, id: candidateId } });
    if (!candidate) return null;
    const row = await prisma.hrCandidateAttachment.create({
      data: {
        tenantId,
        candidateId,
        fileName: data.fileName,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        dataBase64: data.dataBase64,
        uploadedByUserId: data.uploadedByUserId ?? null,
        uploadedByName: data.uploadedByName ?? null,
      },
    });
    return mapAttachmentMeta(row);
  },

  async getAttachment(tenantId: string, candidateId: string, attachmentId: string) {
    const row = await prisma.hrCandidateAttachment.findFirst({
      where: { tenantId, candidateId, id: attachmentId },
    });
    if (!row) return null;
    return {
      ...mapAttachmentMeta(row),
      dataBase64: row.dataBase64,
    };
  },

  async deleteAttachment(tenantId: string, candidateId: string, attachmentId: string) {
    const row = await prisma.hrCandidateAttachment.findFirst({
      where: { tenantId, candidateId, id: attachmentId },
    });
    if (!row) return false;
    await prisma.hrCandidateAttachment.delete({ where: { id: attachmentId } });
    return true;
  },
};
