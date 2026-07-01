-- IMAP inbox: estensione TenantEmailConfig + log messaggi in arrivo

ALTER TABLE "TenantEmailConfig"
  ADD COLUMN IF NOT EXISTS "imapHost" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "imapPort" INTEGER NOT NULL DEFAULT 993,
  ADD COLUMN IF NOT EXISTS "imapSecure" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "imapEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "imapMailbox" TEXT NOT NULL DEFAULT 'INBOX',
  ADD COLUMN IF NOT EXISTS "imapLastUid" INTEGER,
  ADD COLUMN IF NOT EXISTS "imapLastSyncAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "imapLastSyncStatus" TEXT;

CREATE TYPE "InboundEmailStatus" AS ENUM ('pending', 'processed', 'ignored', 'failed');

CREATE TABLE IF NOT EXISTS "InboundEmailMessage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "imapUid" INTEGER NOT NULL,
  "messageId" TEXT,
  "fromEmail" TEXT NOT NULL,
  "fromName" TEXT NOT NULL DEFAULT '',
  "subject" TEXT NOT NULL DEFAULT '',
  "bodyText" TEXT NOT NULL DEFAULT '',
  "receivedAt" TIMESTAMP(3) NOT NULL,
  "status" "InboundEmailStatus" NOT NULL DEFAULT 'pending',
  "parsedType" TEXT,
  "parsedPayload" JSONB,
  "linkedBookingId" TEXT,
  "linkedOrderId" TEXT,
  "errorMessage" TEXT NOT NULL DEFAULT '',
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InboundEmailMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InboundEmailMessage_tenantId_imapUid_key"
  ON "InboundEmailMessage"("tenantId", "imapUid");

CREATE INDEX IF NOT EXISTS "InboundEmailMessage_tenantId_status_receivedAt_idx"
  ON "InboundEmailMessage"("tenantId", "status", "receivedAt");

ALTER TABLE "InboundEmailMessage"
  ADD CONSTRAINT "InboundEmailMessage_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
