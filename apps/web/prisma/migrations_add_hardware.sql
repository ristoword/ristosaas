-- HardwareDevice + PrintRoute: registro dispositivi (stampanti, display KDS,
-- lettori keycard, cassetti denaro) e routing degli eventi di stampa.
-- Idempotent DDL.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HardwareDeviceType') THEN
    CREATE TYPE "HardwareDeviceType" AS ENUM (
      'stampante_termica',
      'stampante_fiscale',
      'display_kds',
      'lettore_keycard',
      'cassetto_denaro',
      'altro'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HardwareDeviceConnection') THEN
    CREATE TYPE "HardwareDeviceConnection" AS ENUM (
      'tcp_ip',
      'usb',
      'bluetooth',
      'hdmi',
      'altro'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HardwareDeviceStatus') THEN
    CREATE TYPE "HardwareDeviceStatus" AS ENUM (
      'online',
      'offline',
      'manutenzione'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HardwareDepartment') THEN
    CREATE TYPE "HardwareDepartment" AS ENUM (
      'cucina',
      'pizzeria',
      'bar',
      'cassa',
      'sala',
      'reception',
      'housekeeping',
      'magazzino',
      'altro'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PrintRouteEvent') THEN
    CREATE TYPE "PrintRouteEvent" AS ENUM (
      'nuova_comanda',
      'ordine_bevande',
      'chiusura_conto',
      'preconto',
      'nota_cucina',
      'keycard_emessa'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "HardwareDevice" (
  "id"         TEXT PRIMARY KEY,
  "tenantId"   TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "type"       "HardwareDeviceType" NOT NULL DEFAULT 'stampante_termica',
  "department" "HardwareDepartment" NOT NULL DEFAULT 'cucina',
  "connection" "HardwareDeviceConnection" NOT NULL DEFAULT 'tcp_ip',
  "ipAddress"  TEXT,
  "port"       INTEGER,
  "status"     "HardwareDeviceStatus" NOT NULL DEFAULT 'offline',
  "notes"      TEXT NOT NULL DEFAULT '',
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HardwareDevice_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HardwareDevice_tenantId_name_key" UNIQUE ("tenantId", "name")
);

CREATE INDEX IF NOT EXISTS "HardwareDevice_tenantId_department_idx"
  ON "HardwareDevice" ("tenantId", "department");

CREATE INDEX IF NOT EXISTS "HardwareDevice_tenantId_status_idx"
  ON "HardwareDevice" ("tenantId", "status");

CREATE TABLE IF NOT EXISTS "PrintRoute" (
  "id"         TEXT PRIMARY KEY,
  "tenantId"   TEXT NOT NULL,
  "event"      "PrintRouteEvent" NOT NULL,
  "department" "HardwareDepartment" NOT NULL,
  "deviceId"   TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrintRoute_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PrintRoute_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "HardwareDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PrintRoute_tenantId_event_department_key" UNIQUE ("tenantId", "event", "department")
);

CREATE INDEX IF NOT EXISTS "PrintRoute_tenantId_department_idx"
  ON "PrintRoute" ("tenantId", "department");

CREATE INDEX IF NOT EXISTS "PrintRoute_tenantId_deviceId_idx"
  ON "PrintRoute" ("tenantId", "deviceId");
