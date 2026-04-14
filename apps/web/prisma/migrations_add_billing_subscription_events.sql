-- Billing persistence for Stripe webhook integration.

CREATE TABLE IF NOT EXISTS "BillingSubscription" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT NOT NULL UNIQUE,
  "priceId" TEXT,
  "status" TEXT NOT NULL,
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "BillingEvent" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT,
  "stripeEventId" TEXT NOT NULL UNIQUE,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "BillingSubscription_tenantId_status_idx"
  ON "BillingSubscription"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "BillingEvent_tenantId_type_idx"
  ON "BillingEvent"("tenantId", "type");
CREATE INDEX IF NOT EXISTS "BillingEvent_createdAt_idx"
  ON "BillingEvent"("createdAt");

DO $$ BEGIN
  ALTER TABLE "BillingSubscription"
  ADD CONSTRAINT "BillingSubscription_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "BillingEvent"
  ADD CONSTRAINT "BillingEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
