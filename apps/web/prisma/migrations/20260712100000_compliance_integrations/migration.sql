-- CreateEnum
CREATE TYPE "PrintJobStatus" AS ENUM ('pending', 'sent', 'error');
CREATE TYPE "FiscalInvoiceStatus" AS ENUM ('draft', 'xml_generated', 'sdi_sent', 'sdi_accepted', 'sdi_rejected');

-- AlterTable
ALTER TABLE "HotelKeycard" ADD COLUMN "lockCredentialId" TEXT;
ALTER TABLE "HotelKeycard" ADD COLUMN "encodedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TenantComplianceConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "alloggiatiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "alloggiatiUsername" TEXT NOT NULL DEFAULT '',
    "alloggiatiPassword" TEXT NOT NULL DEFAULT '',
    "alloggiatiWsKey" TEXT NOT NULL DEFAULT '',
    "alloggiatiApartmentId" TEXT NOT NULL DEFAULT '',
    "fiscalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "fiscalVatNumber" TEXT NOT NULL DEFAULT '',
    "fiscalBusinessName" TEXT NOT NULL DEFAULT '',
    "fiscalPec" TEXT NOT NULL DEFAULT '',
    "fiscalSdiRecipientCode" TEXT NOT NULL DEFAULT '0000000',
    "fiscalRegimeFiscale" TEXT NOT NULL DEFAULT 'RF01',
    "lockEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lockVendor" TEXT NOT NULL DEFAULT 'generic',
    "lockBridgeUrl" TEXT NOT NULL DEFAULT '',
    "lockBridgeApiKey" TEXT NOT NULL DEFAULT '',
    "autoPrintOrders" BOOLEAN NOT NULL DEFAULT true,
    "autoPrintBillClose" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TenantComplianceConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrintJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceId" TEXT,
    "event" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" "PrintJobStatus" NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrintJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FiscalInvoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "progressiveNumber" INTEGER NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "counterparty" TEXT NOT NULL DEFAULT '',
    "counterpartyVat" TEXT NOT NULL DEFAULT '',
    "amount" DECIMAL(12,2) NOT NULL,
    "vatAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "xmlContent" TEXT NOT NULL DEFAULT '',
    "sdiStatus" "FiscalInvoiceStatus" NOT NULL DEFAULT 'draft',
    "sdiMessageId" TEXT,
    "sdiResponse" TEXT NOT NULL DEFAULT '',
    "orderId" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FiscalInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantComplianceConfig_tenantId_key" ON "TenantComplianceConfig"("tenantId");
CREATE INDEX "PrintJob_tenantId_createdAt_idx" ON "PrintJob"("tenantId", "createdAt");
CREATE UNIQUE INDEX "FiscalInvoice_tenantId_progressiveNumber_kind_key" ON "FiscalInvoice"("tenantId", "progressiveNumber", "kind");
CREATE INDEX "FiscalInvoice_tenantId_issueDate_idx" ON "FiscalInvoice"("tenantId", "issueDate");

ALTER TABLE "TenantComplianceConfig" ADD CONSTRAINT "TenantComplianceConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrintJob" ADD CONSTRAINT "PrintJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrintJob" ADD CONSTRAINT "PrintJob_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "HardwareDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FiscalInvoice" ADD CONSTRAINT "FiscalInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
