-- Tenant registration country for staff-cost tax rules (IT/NL).
-- Idempotent: safe on databases that already have the column.

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'IT';
