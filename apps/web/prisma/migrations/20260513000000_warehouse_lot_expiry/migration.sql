-- Migration: aggiungi lotNumber e expiryDate a WarehouseItem
-- Entrambi i campi sono opzionali (nullable) — nessun breaking change.
ALTER TABLE "WarehouseItem"
  ADD COLUMN IF NOT EXISTS "lotNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMPTZ;
