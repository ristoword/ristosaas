-- Persistent AI conversational memory (multi-tenant per user)

CREATE TABLE IF NOT EXISTS "AiUserMemoryProfile" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "preferences" JSONB NOT NULL DEFAULT '{}',
  "lastContext" TEXT NOT NULL DEFAULT '',
  "summary" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiUserMemoryProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiUserMemoryProfile_tenantId_userId_key"
  ON "AiUserMemoryProfile"("tenantId", "userId");

CREATE TABLE IF NOT EXISTS "AiMemoryTurn" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'chat',
  "context" TEXT NOT NULL DEFAULT '',
  "userMessage" TEXT NOT NULL,
  "assistantMessage" TEXT,
  "toolsUsed" JSONB NOT NULL DEFAULT '[]',
  "aiDecisions" JSONB NOT NULL DEFAULT '[]',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiMemoryTurn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiMemoryTurn_tenantId_userId_createdAt_idx"
  ON "AiMemoryTurn"("tenantId", "userId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "AiMemoryVector" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "memoryKey" TEXT NOT NULL,
  "turnId" TEXT,
  "content" TEXT NOT NULL,
  "embeddingModel" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "embedding" vector(1536) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiMemoryVector_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiMemoryVector_tenant_user_key_key"
  ON "AiMemoryVector"("tenantId", "userId", "memoryKey");

CREATE INDEX IF NOT EXISTS "AiMemoryVector_tenantId_userId_idx"
  ON "AiMemoryVector"("tenantId", "userId");

ALTER TABLE "AiUserMemoryProfile"
  ADD CONSTRAINT "AiUserMemoryProfile_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiMemoryTurn"
  ADD CONSTRAINT "AiMemoryTurn_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
