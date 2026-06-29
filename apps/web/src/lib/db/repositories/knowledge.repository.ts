import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

export type KnowledgeDocumentRow = {
  id: string;
  tenantId: string | null;
  title: string;
  module: string;
  category: string;
  mimeType: string;
  language: string;
  sourceKind: string;
  sourceEntity: string | null;
  sourceEntityId: string | null;
  authorId: string | null;
  authorName: string | null;
  version: number;
  contentHash: string;
  status: string;
  chunkCount: number;
  lastIndexedAt: Date | null;
  lastError: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export const knowledgeRepository = {
  async listDocuments(params: {
    tenantId?: string | null;
    module?: string;
    category?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
    superAdmin?: boolean;
  }) {
    const where: Prisma.AiKnowledgeDocumentWhereInput = {
      status: { not: "deleted" },
    };
    if (!params.superAdmin) {
      where.tenantId = params.tenantId ?? "__none__";
    } else if (params.tenantId) {
      where.tenantId = params.tenantId;
    }
    if (params.module) where.module = params.module;
    if (params.category) where.category = params.category;
    if (params.status) where.status = params.status as Prisma.EnumAiKnowledgeDocumentStatusFilter["equals"];
    if (params.search?.trim()) {
      where.OR = [
        { title: { contains: params.search.trim(), mode: "insensitive" } },
        { fileName: { contains: params.search.trim(), mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.aiKnowledgeDocument.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: params.limit ?? 50,
        skip: params.offset ?? 0,
        select: {
          id: true,
          tenantId: true,
          title: true,
          module: true,
          category: true,
          mimeType: true,
          language: true,
          sourceKind: true,
          sourceEntity: true,
          sourceEntityId: true,
          authorId: true,
          authorName: true,
          version: true,
          contentHash: true,
          status: true,
          chunkCount: true,
          lastIndexedAt: true,
          lastError: true,
          fileName: true,
          fileSizeBytes: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.aiKnowledgeDocument.count({ where }),
    ]);

    return { items, total };
  },

  async getDocument(id: string, tenantId?: string | null, superAdmin = false) {
    const doc = await prisma.aiKnowledgeDocument.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { version: "desc" }, take: 20 },
      },
    });
    if (!doc || doc.status === "deleted") return null;
    if (!superAdmin && doc.tenantId !== tenantId) return null;
    return doc;
  },

  async upsertEntityDocument(params: {
    tenantId: string;
    module: string;
    category: string;
    sourceEntity: string;
    sourceEntityId: string;
    title: string;
    contentText: string;
    contentHash: string;
    language?: string;
    metadata?: Record<string, unknown>;
  }) {
    const existing = await prisma.aiKnowledgeDocument.findFirst({
      where: {
        tenantId: params.tenantId,
        sourceEntity: params.sourceEntity,
        sourceEntityId: params.sourceEntityId,
        status: { not: "deleted" },
      },
    });

    if (existing && existing.contentHash === params.contentHash && existing.status === "indexed") {
      return { document: existing, changed: false };
    }

    if (existing) {
      const nextVersion = existing.version + 1;
      const updated = await prisma.$transaction(async (tx) => {
        await tx.aiKnowledgeDocumentVersion.create({
          data: {
            documentId: existing.id,
            version: nextVersion,
            contentHash: params.contentHash,
            contentText: params.contentText,
            changeNote: "Entity sync update",
          },
        });
        return tx.aiKnowledgeDocument.update({
          where: { id: existing.id },
          data: {
            title: params.title,
            module: params.module,
            category: params.category,
            contentText: params.contentText,
            contentHash: params.contentHash,
            version: nextVersion,
            status: "pending",
            lastError: null,
            metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
          },
        });
      });
      return { document: updated, changed: true };
    }

    const created = await prisma.aiKnowledgeDocument.create({
      data: {
        tenantId: params.tenantId,
        title: params.title,
        module: params.module,
        category: params.category,
        mimeType: "text/plain",
        language: params.language ?? "it",
        sourceKind: "entity_sync",
        sourceEntity: params.sourceEntity,
        sourceEntityId: params.sourceEntityId,
        contentText: params.contentText,
        contentHash: params.contentHash,
        status: "pending",
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
    return { document: created, changed: true };
  },

  async createUploadDocument(params: {
    tenantId: string | null;
    title: string;
    module: string;
    category: string;
    mimeType: string;
    language: string;
    contentText?: string;
    contentBase64?: string;
    contentHash: string;
    fileName?: string;
    fileSizeBytes?: number;
    authorId?: string;
    authorName?: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.aiKnowledgeDocument.create({
      data: {
        tenantId: params.tenantId,
        title: params.title,
        module: params.module,
        category: params.category,
        mimeType: params.mimeType,
        language: params.language,
        sourceKind: "upload",
        contentText: params.contentText,
        contentBase64: params.contentBase64,
        contentHash: params.contentHash,
        fileName: params.fileName,
        fileSizeBytes: params.fileSizeBytes,
        authorId: params.authorId,
        authorName: params.authorName,
        status: "pending",
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  },

  async updateDocument(
    id: string,
    data: Prisma.AiKnowledgeDocumentUpdateInput,
    tenantId?: string | null,
    superAdmin = false,
  ) {
    const doc = await this.getDocument(id, tenantId, superAdmin);
    if (!doc) throw new Error("Documento non trovato");
    return prisma.aiKnowledgeDocument.update({ where: { id }, data });
  },

  async softDeleteDocument(id: string, tenantId?: string | null, superAdmin = false) {
    const doc = await this.getDocument(id, tenantId, superAdmin);
    if (!doc) throw new Error("Documento non trovato");
    await prisma.aiVectorChunk.deleteMany({ where: { documentId: id } });
    return prisma.aiKnowledgeDocument.update({
      where: { id },
      data: { status: "deleted", chunkCount: 0 },
    });
  },

  async recordAudit(params: {
    tenantId?: string | null;
    actorId: string;
    actorRole: string;
    actorEmail?: string;
    action: string;
    documentId?: string;
    jobId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    return prisma.aiKnowledgeAuditLog.create({
      data: {
        id: randomUUID(),
        tenantId: params.tenantId ?? null,
        actorId: params.actorId,
        actorRole: params.actorRole,
        actorEmail: params.actorEmail,
        action: params.action,
        documentId: params.documentId,
        jobId: params.jobId,
        metadata: (params.metadata ?? null) as Prisma.InputJsonValue,
        ipAddress: params.ipAddress,
      },
    });
  },

  async listAudit(params: { tenantId?: string | null; limit?: number; superAdmin?: boolean }) {
    const where: Prisma.AiKnowledgeAuditLogWhereInput = {};
    if (!params.superAdmin) where.tenantId = params.tenantId ?? "__none__";
    else if (params.tenantId) where.tenantId = params.tenantId;

    return prisma.aiKnowledgeAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params.limit ?? 100,
    });
  },

  async createJob(params: {
    tenantId?: string | null;
    documentId?: string;
    jobType: string;
    createdBy?: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.aiKnowledgeIndexJob.create({
      data: {
        tenantId: params.tenantId ?? null,
        documentId: params.documentId,
        jobType: params.jobType,
        status: "queued",
        createdBy: params.createdBy,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  },

  async updateJob(id: string, data: Prisma.AiKnowledgeIndexJobUpdateInput) {
    return prisma.aiKnowledgeIndexJob.update({ where: { id }, data });
  },

  async getJob(id: string) {
    return prisma.aiKnowledgeIndexJob.findUnique({ where: { id } });
  },

  async listJobs(params: { tenantId?: string | null; limit?: number; superAdmin?: boolean }) {
    const where: Prisma.AiKnowledgeIndexJobWhereInput = {};
    if (!params.superAdmin) where.tenantId = params.tenantId ?? "__none__";
    else if (params.tenantId) where.tenantId = params.tenantId;
    return prisma.aiKnowledgeIndexJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params.limit ?? 50,
    });
  },
};
