export type AccessCredentialType =
  | "PHYSICAL_KEY"
  | "RFID_CARD"
  | "MOBILE_KEY"
  | "APPLE_WALLET"
  | "GOOGLE_WALLET"
  | "NFC"
  | "BLE"
  | "QR_CODE";

export type AccessCredentialStatus = "pending" | "active" | "expired" | "revoked";

export type MobileAccessDeliveryChannel = "email" | "sms" | "whatsapp" | "qr" | "link";

export type LockVendorId =
  | "salto"
  | "assa_abloy"
  | "dormakaba"
  | "onity"
  | "hafele"
  | "ttlock"
  | "nuki"
  | "yale"
  | "visionline"
  | "kisi"
  | "openpath"
  | "brivo"
  | "remotelock"
  | "internal";

export type AccessCredential = {
  id: string;
  tenantId: string;
  reservationId: string;
  guestId: string;
  guestName?: string;
  roomId: string;
  roomCode?: string;
  credentialType: AccessCredentialType;
  provider: string;
  lockId: string | null;
  status: AccessCredentialStatus;
  validFrom: string;
  validUntil: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  issuedBy: string | null;
  hotelKeycardId: string | null;
  hasSecureLink: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MobileAccessDashboard = {
  mobileKeysActive: number;
  mobileKeysExpired: number;
  rfidCardsActive: number;
  doorsOpenedToday: number;
  lastAccessAt: string | null;
  accessSuccessToday: number;
  accessFailedToday: number;
  locksOnline: number;
  locksOffline: number;
  avgBatteryLevel: number | null;
  lastSyncAt: string | null;
};

export type DoorAccessLogEntry = {
  id: string;
  credentialId: string | null;
  roomId: string;
  roomCode?: string;
  guestName?: string;
  timestamp: string;
  action: string;
  result: string;
  device: string | null;
  ipAddress: string | null;
};

export const MOBILE_ACCESS_TYPES: AccessCredentialType[] = [
  "PHYSICAL_KEY",
  "RFID_CARD",
  "MOBILE_KEY",
  "APPLE_WALLET",
  "GOOGLE_WALLET",
  "NFC",
  "BLE",
  "QR_CODE",
];

export const DIGITAL_ACCESS_TYPES: AccessCredentialType[] = [
  "MOBILE_KEY",
  "APPLE_WALLET",
  "GOOGLE_WALLET",
  "NFC",
  "BLE",
  "QR_CODE",
];
