import { encryptSecret, generateSecureToken } from "@/lib/hotel/access-credential-crypto";
import type {
  LockIssueRequest,
  LockIssueResult,
  LockProviderInterface,
  LockRevokeRequest,
  LockRevokeResult,
  LockSyncResult,
} from "@/lib/hotel/lock-providers/types";
import type { LockVendorId } from "@/modules/hotel/domain/mobile-access-types";

export function createStubLockAdapter(vendorId: LockVendorId, displayName: string): LockProviderInterface {
  return {
    vendorId,
    displayName,
    async issueCredential(request: LockIssueRequest): Promise<LockIssueResult> {
      const token = generateSecureToken();
      const payload = {
        vendor: vendorId,
        room: request.roomCode,
        reservation: request.reservationId,
        guest: request.guestId,
        type: request.credentialType,
        validFrom: request.validFrom.toISOString(),
        validUntil: request.validUntil.toISOString(),
        token,
      };
      return {
        success: true,
        externalCredentialId: `${vendorId.toUpperCase()}-${Date.now()}`,
        encryptedPayload: encryptSecret(JSON.stringify(payload)),
        publicKey: `pk_${vendorId}_${request.roomCode}`,
        accessToken: token,
        walletToken: request.credentialType === "APPLE_WALLET" || request.credentialType === "GOOGLE_WALLET" ? `wallet_${token}` : undefined,
        qrToken: request.credentialType === "QR_CODE" ? `qr_${token}` : undefined,
        rawResponse: { mode: "stub", vendor: vendorId },
      };
    },
    async revokeCredential(request: LockRevokeRequest): Promise<LockRevokeResult> {
      return {
        success: true,
        rawResponse: { mode: "stub", revoked: request.externalCredentialId },
      };
    },
    async syncLocks(tenantId: string): Promise<LockSyncResult> {
      return {
        success: true,
        locksOnline: 0,
        locksOffline: 0,
        lastSync: new Date(),
        rawResponse: { mode: "stub", tenantId },
      } as LockSyncResult & { rawResponse?: Record<string, unknown> };
    },
  };
}
