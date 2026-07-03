-- KeyKARD Serrature: credenziali accesso, provider, serrature, audit.

CREATE TYPE "AccessCredentialType" AS ENUM (
  'PHYSICAL_KEY',
  'RFID_CARD',
  'MOBILE_KEY',
  'APPLE_WALLET',
  'GOOGLE_WALLET',
  'NFC',
  'BLE',
  'QR_CODE'
);

CREATE TYPE "AccessCredentialStatus" AS ENUM ('pending', 'active', 'expired', 'revoked');

CREATE TYPE "LockProviderStatus" AS ENUM ('inactive', 'active', 'error');

CREATE TABLE "LockProvider" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "providerName" TEXT NOT NULL,
  "apiEndpoint" TEXT NOT NULL DEFAULT '',
  "apiKeyEncrypted" TEXT NOT NULL DEFAULT '',
  "hotelIdentifier" TEXT NOT NULL DEFAULT '',
  "status" "LockProviderStatus" NOT NULL DEFAULT 'inactive',
  "lastSync" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LockProvider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DoorLock" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "providerId" TEXT,
  "serialNumber" TEXT NOT NULL DEFAULT '',
  "firmware" TEXT NOT NULL DEFAULT '',
  "batteryLevel" INTEGER,
  "online" BOOLEAN NOT NULL DEFAULT false,
  "lastSeen" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DoorLock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccessCredential" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "guestId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "credentialType" "AccessCredentialType" NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'internal',
  "lockId" TEXT,
  "providerId" TEXT,
  "encryptedCredential" TEXT,
  "publicKey" TEXT,
  "accessTokenEnc" TEXT,
  "walletTokenEnc" TEXT,
  "qrTokenEnc" TEXT,
  "secureLinkHash" TEXT,
  "status" "AccessCredentialStatus" NOT NULL DEFAULT 'pending',
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validUntil" TIMESTAMP(3) NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revokedBy" TEXT,
  "issuedBy" TEXT,
  "hotelKeycardId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccessCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DoorAccessLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "credentialId" TEXT,
  "roomId" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "action" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "providerResponse" TEXT,
  "device" TEXT,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DoorAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccessCredentialAuditLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "credentialId" TEXT,
  "reservationId" TEXT,
  "action" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorName" TEXT,
  "actorRole" TEXT,
  "detail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessCredentialAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LockProvider_tenantId_providerName_key" ON "LockProvider"("tenantId", "providerName");
CREATE INDEX "LockProvider_tenantId_status_idx" ON "LockProvider"("tenantId", "status");

CREATE UNIQUE INDEX "DoorLock_roomId_key" ON "DoorLock"("roomId");
CREATE INDEX "DoorLock_tenantId_online_idx" ON "DoorLock"("tenantId", "online");
CREATE INDEX "DoorLock_tenantId_providerId_idx" ON "DoorLock"("tenantId", "providerId");

CREATE INDEX "AccessCredential_tenantId_reservationId_idx" ON "AccessCredential"("tenantId", "reservationId");
CREATE INDEX "AccessCredential_tenantId_roomId_status_idx" ON "AccessCredential"("tenantId", "roomId", "status");
CREATE INDEX "AccessCredential_tenantId_credentialType_status_idx" ON "AccessCredential"("tenantId", "credentialType", "status");
CREATE INDEX "AccessCredential_tenantId_guestId_idx" ON "AccessCredential"("tenantId", "guestId");

CREATE INDEX "DoorAccessLog_tenantId_roomId_timestamp_idx" ON "DoorAccessLog"("tenantId", "roomId", "timestamp");
CREATE INDEX "DoorAccessLog_tenantId_credentialId_idx" ON "DoorAccessLog"("tenantId", "credentialId");
CREATE INDEX "DoorAccessLog_tenantId_timestamp_idx" ON "DoorAccessLog"("tenantId", "timestamp");

CREATE INDEX "AccessCredentialAuditLog_tenantId_createdAt_idx" ON "AccessCredentialAuditLog"("tenantId", "createdAt");
CREATE INDEX "AccessCredentialAuditLog_tenantId_credentialId_idx" ON "AccessCredentialAuditLog"("tenantId", "credentialId");

ALTER TABLE "LockProvider" ADD CONSTRAINT "LockProvider_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoorLock" ADD CONSTRAINT "DoorLock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoorLock" ADD CONSTRAINT "DoorLock_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "HotelRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoorLock" ADD CONSTRAINT "DoorLock_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "LockProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccessCredential" ADD CONSTRAINT "AccessCredential_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessCredential" ADD CONSTRAINT "AccessCredential_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "HotelReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessCredential" ADD CONSTRAINT "AccessCredential_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "HotelRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessCredential" ADD CONSTRAINT "AccessCredential_lockId_fkey" FOREIGN KEY ("lockId") REFERENCES "DoorLock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccessCredential" ADD CONSTRAINT "AccessCredential_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "LockProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DoorAccessLog" ADD CONSTRAINT "DoorAccessLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoorAccessLog" ADD CONSTRAINT "DoorAccessLog_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "AccessCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DoorAccessLog" ADD CONSTRAINT "DoorAccessLog_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "HotelRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessCredentialAuditLog" ADD CONSTRAINT "AccessCredentialAuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
