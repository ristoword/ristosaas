-- Enterprise RAG: knowledge documents, extended vector chunks, indexing jobs, platform config

DO $$ BEGIN
  CREATE TYPE "AiKnowledgeDocumentStatus" AS ENUM ('pending', 'indexing', 'indexed', 'error', 'deleted');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AiKnowledgeSourceKind" AS ENUM ('upload', 'entity_sync', 'manual_platform');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AiKnowledgeIndexJobStatus" AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "AiPlatformConfig" ADD COLUMN IF NOT EXISTS "embeddingEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AiPlatformConfig" ADD COLUMN IF NOT EXISTS "indexingEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AiPlatformConfig" ADD COLUMN IF NOT EXISTS "ragChunkSize" INTEGER NOT NULL DEFAULT 800;
ALTER TABLE "AiPlatformConfig" ADD COLUMN IF NOT EXISTS "ragChunkOverlap" INTEGER NOT NULL DEFAULT 120;
ALTER TABLE "AiPlatformConfig" ADD COLUMN IF NOT EXISTS "ragSearchThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.32;
ALTER TABLE "AiPlatformConfig" ADD COLUMN IF NOT EXISTS "ragQueryCount" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "AiPlatformConfig" ADD COLUMN IF NOT EXISTS "ragCacheHits" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "AiPlatformConfig" ADD COLUMN IF NOT EXISTS "ragAvgSearchMs" DOUBLE PRECISION;
ALTER TABLE "AiPlatformConfig" ADD COLUMN IF NOT EXISTS "ragAvgEmbedMs" DOUBLE PRECISION;

ALTER TABLE "AiVectorChunk" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "AiVectorChunk" ADD COLUMN IF NOT EXISTS "documentId" TEXT;
ALTER TABLE "AiVectorChunk" ADD COLUMN IF NOT EXISTS "module" TEXT;
ALTER TABLE "AiVectorChunk" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "AiVectorChunk" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'it';
ALTER TABLE "AiVectorChunk" ADD COLUMN IF NOT EXISTS "authorId" TEXT;
ALTER TABLE "AiVectorChunk" ADD COLUMN IF NOT EXISTS "authorName" TEXT;
ALTER TABLE "AiVectorChunk" ADD COLUMN IF NOT EXISTS "documentVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "AiVectorChunk" ADD COLUMN IF NOT EXISTS "chunkIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AiVectorChunk" ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS "AiKnowledgeDocument" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "title" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'general',
  "mimeType" TEXT NOT NULL DEFAULT 'text/plain',
  "language" TEXT NOT NULL DEFAULT 'it',
  "sourceKind" "AiKnowledgeSourceKind" NOT NULL DEFAULT 'upload',
  "sourceEntity" TEXT,
  "sourceEntityId" TEXT,
  "authorId" TEXT,
  "authorName" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "contentHash" TEXT NOT NULL,
  "contentText" TEXT,
  "contentBase64" TEXT,
  "fileName" TEXT,
  "fileSizeBytes" INTEGER,
  "status" "AiKnowledgeDocumentStatus" NOT NULL DEFAULT 'pending',
  "chunkCount" INTEGER NOT NULL DEFAULT 0,
  "lastIndexedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiKnowledgeDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AiKnowledgeDocumentVersion" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "contentHash" TEXT NOT NULL,
  "contentText" TEXT,
  "authorId" TEXT,
  "authorName" TEXT,
  "changeNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiKnowledgeDocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AiKnowledgeIndexJob" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "documentId" TEXT,
  "jobType" TEXT NOT NULL,
  "status" "AiKnowledgeIndexJobStatus" NOT NULL DEFAULT 'queued',
  "progressPct" INTEGER NOT NULL DEFAULT 0,
  "chunksTotal" INTEGER NOT NULL DEFAULT 0,
  "chunksDone" INTEGER NOT NULL DEFAULT 0,
  "embeddingsDone" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiKnowledgeIndexJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AiKnowledgeAuditLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "actorId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "actorEmail" TEXT,
  "action" TEXT NOT NULL,
  "documentId" TEXT,
  "jobId" TEXT,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiKnowledgeAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiKnowledgeDocumentVersion_documentId_version_key"
  ON "AiKnowledgeDocumentVersion"("documentId", "version");
CREATE INDEX IF NOT EXISTS "AiKnowledgeDocument_tenantId_module_status_idx"
  ON "AiKnowledgeDocument"("tenantId", "module", "status");
CREATE INDEX IF NOT EXISTS "AiKnowledgeDocument_tenantId_category_idx"
  ON "AiKnowledgeDocument"("tenantId", "category");
CREATE INDEX IF NOT EXISTS "AiKnowledgeDocument_tenantId_sourceEntity_sourceEntityId_idx"
  ON "AiKnowledgeDocument"("tenantId", "sourceEntity", "sourceEntityId");
CREATE INDEX IF NOT EXISTS "AiKnowledgeDocument_status_updatedAt_idx"
  ON "AiKnowledgeDocument"("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "AiKnowledgeDocumentVersion_documentId_createdAt_idx"
  ON "AiKnowledgeDocumentVersion"("documentId", "createdAt");
CREATE INDEX IF NOT EXISTS "AiKnowledgeIndexJob_tenantId_status_createdAt_idx"
  ON "AiKnowledgeIndexJob"("tenantId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "AiKnowledgeIndexJob_status_createdAt_idx"
  ON "AiKnowledgeIndexJob"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "AiKnowledgeAuditLog_tenantId_createdAt_idx"
  ON "AiKnowledgeAuditLog"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "AiKnowledgeAuditLog_action_createdAt_idx"
  ON "AiKnowledgeAuditLog"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "AiKnowledgeAuditLog_documentId_idx"
  ON "AiKnowledgeAuditLog"("documentId");
CREATE INDEX IF NOT EXISTS "AiVectorChunk_tenantId_module_idx"
  ON "AiVectorChunk"("tenantId", "module");
CREATE INDEX IF NOT EXISTS "AiVectorChunk_tenantId_documentId_idx"
  ON "AiVectorChunk"("tenantId", "documentId");
CREATE INDEX IF NOT EXISTS "AiVectorChunk_documentId_idx"
  ON "AiVectorChunk"("documentId");

DO $$ BEGIN
  ALTER TABLE "AiVectorChunk"
    ADD CONSTRAINT "AiVectorChunk_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "AiVectorChunk"
    ADD CONSTRAINT "AiVectorChunk_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "AiKnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "AiKnowledgeDocument"
    ADD CONSTRAINT "AiKnowledgeDocument_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "AiKnowledgeDocumentVersion"
    ADD CONSTRAINT "AiKnowledgeDocumentVersion_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "AiKnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "AiKnowledgeIndexJob"
    ADD CONSTRAINT "AiKnowledgeIndexJob_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "AiKnowledgeIndexJob"
    ADD CONSTRAINT "AiKnowledgeIndexJob_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "AiKnowledgeDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "AiKnowledgeAuditLog"
    ADD CONSTRAINT "AiKnowledgeAuditLog_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "AiVectorChunk_tenant_hnsw_idx"
  ON "AiVectorChunk" USING hnsw (embedding vector_cosine_ops)
  WHERE "tenantId" IS NOT NULL;
