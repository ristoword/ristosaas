-- AI Auto Learning: supervisor feedback + learned patterns (multi-tenant)

CREATE TABLE IF NOT EXISTS "AiLearningFeedback" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userRole" TEXT NOT NULL DEFAULT '',
  "module" TEXT NOT NULL,
  "proposalId" TEXT,
  "outcome" TEXT NOT NULL,
  "motivo" TEXT NOT NULL DEFAULT '',
  "decision" JSONB NOT NULL DEFAULT '{}',
  "confidence" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiLearningFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiLearningFeedback_tenantId_module_outcome_createdAt_idx"
  ON "AiLearningFeedback"("tenantId", "module", "outcome", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "AiLearningFeedback_tenantId_proposalId_idx"
  ON "AiLearningFeedback"("tenantId", "proposalId");

CREATE TABLE IF NOT EXISTS "AiLearningPattern" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "patternKey" TEXT NOT NULL,
  "approvalCount" INTEGER NOT NULL DEFAULT 0,
  "rejectionCount" INTEGER NOT NULL DEFAULT 0,
  "avgConfidence" DOUBLE PRECISION,
  "signals" JSONB NOT NULL DEFAULT '[]',
  "hints" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiLearningPattern_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiLearningPattern_tenant_module_key_key"
  ON "AiLearningPattern"("tenantId", "module", "patternKey");

CREATE INDEX IF NOT EXISTS "AiLearningPattern_tenantId_module_idx"
  ON "AiLearningPattern"("tenantId", "module");

ALTER TABLE "AiLearningFeedback"
  ADD CONSTRAINT "AiLearningFeedback_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiLearningPattern"
  ADD CONSTRAINT "AiLearningPattern_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
