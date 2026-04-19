-- Platform maintenance flag + per-tenant access (block) for Super Admin controls.

DO $$ BEGIN
  CREATE TYPE "TenantAccessStatus" AS ENUM ('active', 'blocked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "accessStatus" "TenantAccessStatus" NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS "PlatformConfig" (
  "id" TEXT PRIMARY KEY,
  "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "PlatformConfig" ("id", "maintenanceMode", "updatedAt")
VALUES ('default', false, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
