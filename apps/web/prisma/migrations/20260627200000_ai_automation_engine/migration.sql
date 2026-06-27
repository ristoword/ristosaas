-- AI Automation Engine (multi-tenant workflows)

CREATE TABLE IF NOT EXISTS "AiAutomationConfig" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT '',
  "level" INTEGER NOT NULL DEFAULT 2,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "triggers" JSONB NOT NULL DEFAULT '{}',
  "conditions" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiAutomationConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiAutomationConfig_tenant_module_role_key"
  ON "AiAutomationConfig"("tenantId", "module", "role");

CREATE TABLE IF NOT EXISTS "AiAutomationRun" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "triggerType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "level" INTEGER NOT NULL DEFAULT 2,
  "idempotencyKey" TEXT NOT NULL,
  "context" JSONB NOT NULL DEFAULT '{}',
  "dataUsed" JSONB NOT NULL DEFAULT '[]',
  "aiReasoning" TEXT,
  "confidence" DOUBLE PRECISION,
  "motivation" TEXT,
  "proposalId" TEXT,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "executedActions" JSONB NOT NULL DEFAULT '[]',
  "rollbackPayload" JSONB,
  "errorMessage" TEXT,
  "triggeredBy" TEXT NOT NULL DEFAULT 'scheduler',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),

  CONSTRAINT "AiAutomationRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiAutomationRun_tenantId_status_startedAt_idx"
  ON "AiAutomationRun"("tenantId", "status", "startedAt" DESC);

CREATE INDEX IF NOT EXISTS "AiAutomationRun_tenantId_idempotencyKey_idx"
  ON "AiAutomationRun"("tenantId", "idempotencyKey");

CREATE TABLE IF NOT EXISTS "AiAutomationAuditLog" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiAutomationAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiAutomationAuditLog_runId_createdAt_idx"
  ON "AiAutomationAuditLog"("runId", "createdAt");

CREATE INDEX IF NOT EXISTS "AiAutomationAuditLog_tenantId_createdAt_idx"
  ON "AiAutomationAuditLog"("tenantId", "createdAt" DESC);

ALTER TABLE "AiAutomationConfig"
  ADD CONSTRAINT "AiAutomationConfig_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiAutomationRun"
  ADD CONSTRAINT "AiAutomationRun_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiAutomationAuditLog"
  ADD CONSTRAINT "AiAutomationAuditLog_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
