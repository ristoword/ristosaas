-- Note operative per reparto (pizzeria, bar, cucina, sala)
-- Persistenza delle note vocali/testuali degli operatori per turno.

CREATE TABLE IF NOT EXISTS "OperationalNote" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"  TEXT        NOT NULL,
  "area"      TEXT        NOT NULL,
  "text"      TEXT        NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "OperationalNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OperationalNote_tenant_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "OperationalNote_tenantId_area_idx"
  ON "OperationalNote" ("tenantId", "area");
