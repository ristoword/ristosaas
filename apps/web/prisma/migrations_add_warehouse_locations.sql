-- Aggiunge gestione scorte per reparto al modulo Magazzino.
-- Operazioni idempotenti (IF NOT EXISTS / DO $$ ... $$).

-- 1. Nuovi valori enum per tipo movimento
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'trasferimento'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'WarehouseMovementType')
  ) THEN
    ALTER TYPE "WarehouseMovementType" ADD VALUE 'trasferimento';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'rettifica'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'WarehouseMovementType')
  ) THEN
    ALTER TYPE "WarehouseMovementType" ADD VALUE 'rettifica';
  END IF;
END $$;

-- 2. Nuovi campi su WarehouseMovement
ALTER TABLE "WarehouseMovement"
  ADD COLUMN IF NOT EXISTS "fromLocation" TEXT,
  ADD COLUMN IF NOT EXISTS "toLocation"   TEXT,
  ADD COLUMN IF NOT EXISTS "note"         TEXT;

-- 3. Tabella scorte per reparto
CREATE TABLE IF NOT EXISTS "WarehouseLocationStock" (
  "id"              TEXT        NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"        TEXT        NOT NULL,
  "warehouseItemId" TEXT        NOT NULL,
  "location"        TEXT        NOT NULL,
  "qty"             DECIMAL(12,3) NOT NULL DEFAULT 0,
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "WarehouseLocationStock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WarehouseLocationStock_unique" UNIQUE ("tenantId", "warehouseItemId", "location"),
  CONSTRAINT "WarehouseLocationStock_tenant_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "WarehouseLocationStock_item_fkey"
    FOREIGN KEY ("warehouseItemId") REFERENCES "WarehouseItem"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "WarehouseLocationStock_tenant_location_idx"
  ON "WarehouseLocationStock" ("tenantId", "location");

CREATE INDEX IF NOT EXISTS "WarehouseLocationStock_tenant_item_idx"
  ON "WarehouseLocationStock" ("tenantId", "warehouseItemId");
