-- HaccpEntry: log HACCP per tenant (temperature frigo/freezer/cottura, sanificazioni, ecc.)
-- Idempotent DDL.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HaccpEntryType') THEN
    CREATE TYPE "HaccpEntryType" AS ENUM (
      'temp_frigo',
      'temp_freezer',
      'temp_cottura',
      'temp_abbattitore',
      'sanificazione',
      'ricezione_merce',
      'altro'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "HaccpEntry" (
  "id"         TEXT PRIMARY KEY,
  "tenantId"   TEXT NOT NULL,
  "type"       "HaccpEntryType" NOT NULL DEFAULT 'temp_frigo',
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "location"   TEXT NOT NULL DEFAULT '',
  "tempC"      DECIMAL(5, 2),
  "operator"   TEXT NOT NULL DEFAULT '',
  "notes"      TEXT NOT NULL DEFAULT '',
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HaccpEntry_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "HaccpEntry_tenantId_recordedAt_idx"
  ON "HaccpEntry" ("tenantId", "recordedAt");

CREATE INDEX IF NOT EXISTS "HaccpEntry_tenantId_type_recordedAt_idx"
  ON "HaccpEntry" ("tenantId", "type", "recordedAt");
