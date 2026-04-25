-- Turni pianificati per reparto (cucina, pizzeria, bar, sala).
-- Sostituisce lo stato React locale del tab "Turni cucina".

CREATE TABLE IF NOT EXISTS "ShiftPlan" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"  TEXT        NOT NULL,
  "area"      TEXT        NOT NULL DEFAULT 'cucina',
  "day"       TEXT        NOT NULL,
  "staffName" TEXT        NOT NULL,
  "hours"     TEXT        NOT NULL DEFAULT '',
  "role"      TEXT        NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ShiftPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShiftPlan_tenant_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ShiftPlan_tenantId_area_idx"
  ON "ShiftPlan" ("tenantId", "area");
