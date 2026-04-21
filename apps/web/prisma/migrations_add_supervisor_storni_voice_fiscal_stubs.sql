-- SupervisorStorno, WarehouseVoiceLog, ArchivioFiscalStub
-- Idempotent DDL. Internal operational records (not RT / SDI).

CREATE TABLE IF NOT EXISTS "SupervisorStorno" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "motivo" TEXT NOT NULL,
  "tavolo" TEXT NOT NULL DEFAULT '',
  "ordineId" TEXT NOT NULL DEFAULT '',
  "note" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupervisorStorno_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SupervisorStorno_tenantId_createdAt_idx"
  ON "SupervisorStorno" ("tenantId", "createdAt");

CREATE TABLE IF NOT EXISTS "WarehouseVoiceLog" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "transcript" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarehouseVoiceLog_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "WarehouseVoiceLog_tenantId_createdAt_idx"
  ON "WarehouseVoiceLog" ("tenantId", "createdAt");

CREATE TABLE IF NOT EXISTS "ArchivioFiscalStub" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "reference" TEXT NOT NULL DEFAULT '',
  "counterparty" TEXT NOT NULL DEFAULT '',
  "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "vatRateNote" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArchivioFiscalStub_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ArchivioFiscalStub_tenantId_kind_createdAt_idx"
  ON "ArchivioFiscalStub" ("tenantId", "kind", "createdAt");
