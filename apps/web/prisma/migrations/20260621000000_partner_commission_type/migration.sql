-- AlterTable: add commission type, percentage, contact fields to Partner
ALTER TABLE "Partner" ADD COLUMN "commissionType" TEXT NOT NULL DEFAULT 'fixed';
ALTER TABLE "Partner" ADD COLUMN "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Partner" ADD COLUMN "allInclusivePct" DOUBLE PRECISION;
ALTER TABLE "Partner" ADD COLUMN "email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Partner" ADD COLUMN "phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Partner" ADD COLUMN "notes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Partner" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
