-- CreateEnum
CREATE TYPE "FolioBillingMode" AS ENUM ('guest', 'company', 'mixed');

-- AlterTable
ALTER TABLE "FolioAuditLog" ADD COLUMN "userRole" TEXT;

-- CreateIndex
CREATE INDEX "FolioCharge_folioId_sourceId_idx" ON "FolioCharge"("folioId", "sourceId");

-- CreateTable
CREATE TABLE "FolioCompanyAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vatNumber" TEXT,
    "taxCode" TEXT,
    "costCenter" TEXT,
    "creditLimit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outstandingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deferredBilling" BOOLEAN NOT NULL DEFAULT false,
    "contractRef" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FolioCompanyAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FolioCompanyAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "folioId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "splitCode" TEXT NOT NULL DEFAULT 'COMPANY',
    "billingMode" "FolioBillingMode" NOT NULL DEFAULT 'mixed',
    "amountLimit" DECIMAL(12,2),
    "costCenter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FolioCompanyAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FolioSplitDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "folioId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FolioSplitDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FolioMergeLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceFolioId" TEXT NOT NULL,
    "targetFolioId" TEXT NOT NULL,
    "chargeIds" TEXT[],
    "userId" TEXT,
    "userName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FolioMergeLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FolioEmailLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "folioId" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FolioEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FolioCompanyAccount_tenantId_name_idx" ON "FolioCompanyAccount"("tenantId", "name");
CREATE INDEX "FolioCompanyAccount_tenantId_active_idx" ON "FolioCompanyAccount"("tenantId", "active");
CREATE INDEX "FolioCompanyAssignment_tenantId_folioId_idx" ON "FolioCompanyAssignment"("tenantId", "folioId");
CREATE INDEX "FolioCompanyAssignment_tenantId_companyId_idx" ON "FolioCompanyAssignment"("tenantId", "companyId");
CREATE UNIQUE INDEX "FolioSplitDefinition_folioId_code_key" ON "FolioSplitDefinition"("folioId", "code");
CREATE INDEX "FolioSplitDefinition_tenantId_folioId_idx" ON "FolioSplitDefinition"("tenantId", "folioId");
CREATE INDEX "FolioMergeLog_tenantId_targetFolioId_idx" ON "FolioMergeLog"("tenantId", "targetFolioId");
CREATE INDEX "FolioMergeLog_tenantId_sourceFolioId_idx" ON "FolioMergeLog"("tenantId", "sourceFolioId");
CREATE INDEX "FolioEmailLog_tenantId_folioId_idx" ON "FolioEmailLog"("tenantId", "folioId");
CREATE INDEX "FolioEmailLog_tenantId_sentAt_idx" ON "FolioEmailLog"("tenantId", "sentAt");

-- AddForeignKey
ALTER TABLE "FolioCompanyAccount" ADD CONSTRAINT "FolioCompanyAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FolioCompanyAssignment" ADD CONSTRAINT "FolioCompanyAssignment_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "GuestFolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FolioCompanyAssignment" ADD CONSTRAINT "FolioCompanyAssignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "FolioCompanyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FolioSplitDefinition" ADD CONSTRAINT "FolioSplitDefinition_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "GuestFolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FolioMergeLog" ADD CONSTRAINT "FolioMergeLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FolioEmailLog" ADD CONSTRAINT "FolioEmailLog_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "GuestFolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FolioEmailLog" ADD CONSTRAINT "FolioEmailLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
