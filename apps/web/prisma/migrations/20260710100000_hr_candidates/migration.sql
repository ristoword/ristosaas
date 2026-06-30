-- CreateEnum
CREATE TYPE "HrCandidateStatus" AS ENUM ('new', 'screening', 'interview', 'offer', 'hired', 'rejected', 'archived');

-- CreateEnum
CREATE TYPE "HrCandidateSource" AS ENUM ('manual', 'email', 'paper');

-- CreateTable
CREATE TABLE "HrCandidate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "age" INTEGER,
    "experienceYears" INTEGER,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "HrCandidateStatus" NOT NULL DEFAULT 'new',
    "source" "HrCandidateSource" NOT NULL DEFAULT 'manual',
    "sourceEmailFrom" TEXT NOT NULL DEFAULT '',
    "sourceEmailSubject" TEXT NOT NULL DEFAULT '',
    "sourceEmailBody" TEXT NOT NULL DEFAULT '',
    "presentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrCandidateAttachment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "dataBase64" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "uploadedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrCandidateAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HrCandidate_tenantId_status_idx" ON "HrCandidate"("tenantId", "status");

-- CreateIndex
CREATE INDEX "HrCandidate_tenantId_presentedAt_idx" ON "HrCandidate"("tenantId", "presentedAt");

-- CreateIndex
CREATE INDEX "HrCandidate_tenantId_source_idx" ON "HrCandidate"("tenantId", "source");

-- CreateIndex
CREATE INDEX "HrCandidateAttachment_tenantId_candidateId_idx" ON "HrCandidateAttachment"("tenantId", "candidateId");

-- AddForeignKey
ALTER TABLE "HrCandidate" ADD CONSTRAINT "HrCandidate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrCandidateAttachment" ADD CONSTRAINT "HrCandidateAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrCandidateAttachment" ADD CONSTRAINT "HrCandidateAttachment_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "HrCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
