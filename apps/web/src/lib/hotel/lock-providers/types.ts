import type { AccessCredentialType, LockVendorId } from "@/modules/hotel/domain/mobile-access-types";

export type LockIssueRequest = {
  tenantId: string;
  providerName: LockVendorId;
  roomCode: string;
  reservationId: string;
  guestId: string;
  guestName: string;
  credentialType: AccessCredentialType;
  validFrom: Date;
  validUntil: Date;
  hotelIdentifier?: string;
};

export type LockIssueResult = {
  success: boolean;
  externalCredentialId?: string;
  encryptedPayload?: string;
  publicKey?: string;
  accessToken?: string;
  walletToken?: string;
  qrToken?: string;
  rawResponse?: Record<string, unknown>;
  errorMessage?: string;
};

export type LockRevokeRequest = {
  tenantId: string;
  providerName: LockVendorId;
  externalCredentialId: string;
  roomCode: string;
};

export type LockRevokeResult = {
  success: boolean;
  errorMessage?: string;
  rawResponse?: Record<string, unknown>;
};

export type LockSyncResult = {
  success: boolean;
  locksOnline: number;
  locksOffline: number;
  lastSync: Date;
  errorMessage?: string;
};

/** Adapter astratto per produttori serrature (API reali da collegare in seguito). */
export interface LockProviderInterface {
  readonly vendorId: LockVendorId;
  readonly displayName: string;
  issueCredential(request: LockIssueRequest): Promise<LockIssueResult>;
  revokeCredential(request: LockRevokeRequest): Promise<LockRevokeResult>;
  syncLocks?(tenantId: string, hotelIdentifier: string): Promise<LockSyncResult>;
}
