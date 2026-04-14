-- Persist remaining operations modules: staff, bookings, suppliers, catering, asporto, archivio.

DO $$ BEGIN CREATE TYPE "StaffStatus" AS ENUM ('attivo', 'ferie', 'malattia', 'licenziato'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "BookingStatus" AS ENUM ('confermata', 'in_attesa', 'annullata', 'completata'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "CateringStatus" AS ENUM ('preventivo', 'confermato', 'completato', 'annullato'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "TakeawayOrderStatus" AS ENUM ('nuovo', 'in_preparazione', 'pronto', 'ritirato', 'consegnato', 'annullato'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "TakeawayOrderType" AS ENUM ('asporto', 'delivery'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ArchivedOrderStatus" AS ENUM ('completato', 'annullato', 'stornato'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ArchivedPaymentMethod" AS ENUM ('contanti', 'carta', 'misto'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "StaffMember" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "hireDate" TIMESTAMP(3) NOT NULL,
  "salary" DECIMAL(10,2) NOT NULL,
  "status" "StaffStatus" NOT NULL,
  "hoursWeek" INTEGER NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Booking" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "time" TEXT NOT NULL,
  "guests" INTEGER NOT NULL,
  "table" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "status" "BookingStatus" NOT NULL,
  "allergies" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Supplier" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "piva" TEXT NOT NULL,
  "paymentTerms" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CateringEvent" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "guests" INTEGER NOT NULL,
  "venue" TEXT NOT NULL,
  "budget" DECIMAL(10,2) NOT NULL,
  "status" "CateringStatus" NOT NULL,
  "contact" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "menu" TEXT NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "depositPaid" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TakeawayOrder" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "total" DECIMAL(10,2) NOT NULL,
  "status" "TakeawayOrderStatus" NOT NULL,
  "pickupTime" TEXT NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "type" "TakeawayOrderType" NOT NULL,
  "address" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ArchivedOrder" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "table" TEXT NOT NULL,
  "waiter" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "total" DECIMAL(10,2) NOT NULL,
  "status" "ArchivedOrderStatus" NOT NULL,
  "paymentMethod" "ArchivedPaymentMethod" NOT NULL,
  "closedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "CateringEvent" ADD CONSTRAINT "CateringEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "TakeawayOrder" ADD CONSTRAINT "TakeawayOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "ArchivedOrder" ADD CONSTRAINT "ArchivedOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
