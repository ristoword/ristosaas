-- CreateEnum
CREATE TYPE "GuestRegisterEntryStatus" AS ENUM ('draft', 'incomplete', 'complete', 'checked_out');
CREATE TYPE "GuestRegisterTransmissionStatus" AS ENUM ('pending', 'sent', 'error', 'cancelled');
CREATE TYPE "GuestRegisterPersonSex" AS ENUM ('M', 'F', 'X', 'unknown');
CREATE TYPE "GuestRegisterDocumentType" AS ENUM ('passport', 'identity_card', 'driving_license', 'visa', 'other');
CREATE TYPE "GuestRegisterAttachmentType" AS ENUM ('document_front', 'document_back', 'passport', 'visa', 'driving_license', 'receipt', 'contract', 'signature_privacy', 'signature_checkin', 'signature_rules');
CREATE TYPE "GuestRegisterOcrStatus" AS ENUM ('none', 'pending', 'completed', 'verified', 'failed');
CREATE TYPE "GuestRegisterCountry" AS ENUM ('IT', 'NL', 'BE', 'DE', 'FR', 'ES');

-- CreateTable
CREATE TABLE "GuestRegisterEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "stayId" TEXT,
    "roomId" TEXT,
    "status" "GuestRegisterEntryStatus" NOT NULL DEFAULT 'draft',
    "transmissionStatus" "GuestRegisterTransmissionStatus" NOT NULL DEFAULT 'pending',
    "transmissionCountry" "GuestRegisterCountry" NOT NULL DEFAULT 'IT',
    "arrivalDate" TIMESTAMP(3) NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "guestCount" INTEGER NOT NULL DEFAULT 1,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "roomCode" TEXT,
    "notes" TEXT,
    "lastTransmissionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestRegisterEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuestRegisterPerson" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "sex" "GuestRegisterPersonSex" NOT NULL DEFAULT 'unknown',
    "dateOfBirth" TIMESTAMP(3),
    "placeOfBirth" TEXT,
    "stateOfBirth" TEXT,
    "nationality" TEXT,
    "residenceCountry" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "province" TEXT,
    "taxCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "documentType" "GuestRegisterDocumentType",
    "documentNumber" TEXT,
    "documentIssueDate" TIMESTAMP(3),
    "documentExpiryDate" TIMESTAMP(3),
    "documentIssuingAuthority" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "ocrStatus" "GuestRegisterOcrStatus" NOT NULL DEFAULT 'none',
    "ocrPayload" JSONB,
    "ocrVerifiedAt" TIMESTAMP(3),
    "ocrVerifiedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestRegisterPerson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuestRegisterAttachment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "personId" TEXT,
    "type" "GuestRegisterAttachmentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "encryptionIv" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "uploadedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestRegisterAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuestRegisterTransmission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "country" "GuestRegisterCountry" NOT NULL,
    "adapterCode" TEXT NOT NULL,
    "status" "GuestRegisterTransmissionStatus" NOT NULL,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "errorMessage" TEXT,
    "externalRef" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestRegisterTransmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuestRegisterAuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entryId" TEXT,
    "personId" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "device" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestRegisterAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuestRegisterAccessLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entryId" TEXT,
    "personId" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "action" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestRegisterAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestRegisterEntry_reservationId_key" ON "GuestRegisterEntry"("reservationId");
CREATE UNIQUE INDEX "GuestRegisterEntry_stayId_key" ON "GuestRegisterEntry"("stayId");
CREATE INDEX "GuestRegisterEntry_tenantId_arrivalDate_idx" ON "GuestRegisterEntry"("tenantId", "arrivalDate");
CREATE INDEX "GuestRegisterEntry_tenantId_departureDate_idx" ON "GuestRegisterEntry"("tenantId", "departureDate");
CREATE INDEX "GuestRegisterEntry_tenantId_status_idx" ON "GuestRegisterEntry"("tenantId", "status");
CREATE INDEX "GuestRegisterEntry_tenantId_transmissionStatus_idx" ON "GuestRegisterEntry"("tenantId", "transmissionStatus");
CREATE INDEX "GuestRegisterEntry_tenantId_roomCode_idx" ON "GuestRegisterEntry"("tenantId", "roomCode");

CREATE INDEX "GuestRegisterPerson_tenantId_entryId_idx" ON "GuestRegisterPerson"("tenantId", "entryId");
CREATE INDEX "GuestRegisterPerson_tenantId_lastName_firstName_idx" ON "GuestRegisterPerson"("tenantId", "lastName", "firstName");
CREATE INDEX "GuestRegisterPerson_tenantId_documentNumber_idx" ON "GuestRegisterPerson"("tenantId", "documentNumber");
CREATE INDEX "GuestRegisterPerson_tenantId_nationality_idx" ON "GuestRegisterPerson"("tenantId", "nationality");

CREATE INDEX "GuestRegisterAttachment_tenantId_entryId_idx" ON "GuestRegisterAttachment"("tenantId", "entryId");
CREATE INDEX "GuestRegisterAttachment_tenantId_personId_idx" ON "GuestRegisterAttachment"("tenantId", "personId");

CREATE INDEX "GuestRegisterTransmission_tenantId_entryId_idx" ON "GuestRegisterTransmission"("tenantId", "entryId");
CREATE INDEX "GuestRegisterTransmission_tenantId_status_idx" ON "GuestRegisterTransmission"("tenantId", "status");
CREATE INDEX "GuestRegisterTransmission_tenantId_country_idx" ON "GuestRegisterTransmission"("tenantId", "country");

CREATE INDEX "GuestRegisterAuditLog_tenantId_entryId_createdAt_idx" ON "GuestRegisterAuditLog"("tenantId", "entryId", "createdAt");
CREATE INDEX "GuestRegisterAuditLog_tenantId_createdAt_idx" ON "GuestRegisterAuditLog"("tenantId", "createdAt");

CREATE INDEX "GuestRegisterAccessLog_tenantId_createdAt_idx" ON "GuestRegisterAccessLog"("tenantId", "createdAt");
CREATE INDEX "GuestRegisterAccessLog_tenantId_entryId_idx" ON "GuestRegisterAccessLog"("tenantId", "entryId");

-- AddForeignKey
ALTER TABLE "GuestRegisterEntry" ADD CONSTRAINT "GuestRegisterEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestRegisterEntry" ADD CONSTRAINT "GuestRegisterEntry_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "HotelReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestRegisterEntry" ADD CONSTRAINT "GuestRegisterEntry_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GuestRegisterEntry" ADD CONSTRAINT "GuestRegisterEntry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "HotelRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GuestRegisterPerson" ADD CONSTRAINT "GuestRegisterPerson_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestRegisterPerson" ADD CONSTRAINT "GuestRegisterPerson_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "GuestRegisterEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GuestRegisterAttachment" ADD CONSTRAINT "GuestRegisterAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestRegisterAttachment" ADD CONSTRAINT "GuestRegisterAttachment_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "GuestRegisterEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestRegisterAttachment" ADD CONSTRAINT "GuestRegisterAttachment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "GuestRegisterPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GuestRegisterTransmission" ADD CONSTRAINT "GuestRegisterTransmission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestRegisterTransmission" ADD CONSTRAINT "GuestRegisterTransmission_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "GuestRegisterEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GuestRegisterAuditLog" ADD CONSTRAINT "GuestRegisterAuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestRegisterAuditLog" ADD CONSTRAINT "GuestRegisterAuditLog_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "GuestRegisterEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestRegisterAuditLog" ADD CONSTRAINT "GuestRegisterAuditLog_personId_fkey" FOREIGN KEY ("personId") REFERENCES "GuestRegisterPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GuestRegisterAccessLog" ADD CONSTRAINT "GuestRegisterAccessLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
