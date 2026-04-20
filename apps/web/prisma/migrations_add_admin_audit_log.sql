-- AdminAuditLog: trace super_admin / owner mutations on sensitive objects.
-- Idempotent DDL.

CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
  "id"         TEXT PRIMARY KEY,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorId"    TEXT NOT NULL,
  "actorRole"  TEXT NOT NULL,
  "actorEmail" TEXT,
  "action"     TEXT NOT NULL,
  "tenantId"   TEXT,
  "targetId"   TEXT,
  "metadata"   JSONB,
  "ipAddress"  TEXT
);

CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx"
  ON "AdminAuditLog" ("createdAt");

CREATE INDEX IF NOT EXISTS "AdminAuditLog_tenantId_createdAt_idx"
  ON "AdminAuditLog" ("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "AdminAuditLog_action_createdAt_idx"
  ON "AdminAuditLog" ("action", "createdAt");
