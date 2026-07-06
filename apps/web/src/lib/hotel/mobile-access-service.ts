import type {
  AccessCredentialStatus,
  AccessCredentialType,
  MobileAccessDeliveryChannel,
} from "@/modules/hotel/domain/mobile-access-types";
import type {
  AccessCredential,
  DoorAccessLogEntry,
  MobileAccessDashboard,
} from "@/modules/hotel/domain/mobile-access-types";
import { prisma } from "@/lib/db/prisma";
import {
  decryptSecret,
  encryptSecret,
  generateSecureToken,
  hashSecureToken,
} from "@/lib/hotel/access-credential-crypto";
import { getLockAdapter } from "@/lib/hotel/lock-providers/registry";
import type { LockVendorId } from "@/modules/hotel/domain/mobile-access-types";
import { DIGITAL_ACCESS_TYPES } from "@/modules/hotel/domain/mobile-access-types";

export type MobileAccessActor = {
  userId?: string;
  userName?: string;
  userRole?: string;
  ip?: string;
};

function mapCredential(row: {
  id: string;
  tenantId: string;
  reservationId: string;
  guestId: string;
  roomId: string;
  credentialType: AccessCredentialType;
  provider: string;
  lockId: string | null;
  status: AccessCredentialStatus;
  validFrom: Date;
  validUntil: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  revokedBy: string | null;
  issuedBy: string | null;
  hotelKeycardId: string | null;
  secureLinkHash: string | null;
  createdAt: Date;
  updatedAt: Date;
  reservation?: { guestName: string };
  room?: { code: string };
}): AccessCredential {
  return {
    id: row.id,
    tenantId: row.tenantId,
    reservationId: row.reservationId,
    guestId: row.guestId,
    guestName: row.reservation?.guestName,
    roomId: row.roomId,
    roomCode: row.room?.code,
    credentialType: row.credentialType,
    provider: row.provider,
    lockId: row.lockId,
    status: row.status,
    validFrom: row.validFrom.toISOString(),
    validUntil: row.validUntil.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    revokedBy: row.revokedBy,
    issuedBy: row.issuedBy,
    hotelKeycardId: row.hotelKeycardId,
    hasSecureLink: !!row.secureLinkHash,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const credentialInclude = {
  reservation: { select: { guestName: true } },
  room: { select: { code: true } },
} as const;

async function writeAudit(
  tenantId: string,
  action: string,
  actor: MobileAccessActor | undefined,
  params: { credentialId?: string; reservationId?: string; detail?: string },
) {
  await prisma.accessCredentialAuditLog.create({
    data: {
      tenantId,
      credentialId: params.credentialId ?? null,
      reservationId: params.reservationId ?? null,
      action,
      actorUserId: actor?.userId ?? null,
      actorName: actor?.userName ?? null,
      actorRole: actor?.userRole ?? null,
      detail: params.detail ?? null,
    },
  });
}

async function ensureDoorLock(tenantId: string, roomId: string, providerId?: string | null) {
  return prisma.doorLock.upsert({
    where: { roomId },
    update: { providerId: providerId ?? undefined, updatedAt: new Date() },
    create: { tenantId, roomId, providerId: providerId ?? null },
  });
}

async function resolveProvider(tenantId: string, providerName: string) {
  return prisma.lockProvider.upsert({
    where: { tenantId_providerName: { tenantId, providerName } },
    update: {},
    create: {
      tenantId,
      providerName,
      status: providerName === "internal" ? "active" : "inactive",
    },
  });
}

export const mobileAccessService = {
  async getDashboard(tenantId: string): Promise<MobileAccessDashboard> {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [
      mobileKeysActive,
      mobileKeysExpired,
      rfidCardsActive,
      doorsOpenedToday,
      lastLog,
      successToday,
      failedToday,
      locksOnline,
      locksOffline,
      batteryAgg,
      lastProviderSync,
    ] = await Promise.all([
      prisma.accessCredential.count({
        where: {
          tenantId,
          status: "active",
          credentialType: { in: ["MOBILE_KEY", "APPLE_WALLET", "GOOGLE_WALLET", "NFC", "BLE", "QR_CODE"] },
        },
      }),
      prisma.accessCredential.count({
        where: {
          tenantId,
          status: { in: ["expired", "revoked"] },
          credentialType: { in: DIGITAL_ACCESS_TYPES },
        },
      }),
      prisma.accessCredential.count({
        where: { tenantId, status: "active", credentialType: "RFID_CARD" },
      }),
      prisma.doorAccessLog.count({
        where: { tenantId, timestamp: { gte: todayStart }, action: "unlock", result: "success" },
      }),
      prisma.doorAccessLog.findFirst({
        where: { tenantId },
        orderBy: { timestamp: "desc" },
        select: { timestamp: true },
      }),
      prisma.doorAccessLog.count({
        where: { tenantId, timestamp: { gte: todayStart }, result: "success" },
      }),
      prisma.doorAccessLog.count({
        where: { tenantId, timestamp: { gte: todayStart }, result: "failed" },
      }),
      prisma.doorLock.count({ where: { tenantId, online: true } }),
      prisma.doorLock.count({ where: { tenantId, online: false } }),
      prisma.doorLock.aggregate({
        where: { tenantId, batteryLevel: { not: null } },
        _avg: { batteryLevel: true },
      }),
      prisma.lockProvider.findFirst({
        where: { tenantId },
        orderBy: { lastSync: "desc" },
        select: { lastSync: true },
      }),
    ]);

    return {
      mobileKeysActive,
      mobileKeysExpired,
      rfidCardsActive,
      doorsOpenedToday,
      lastAccessAt: lastLog?.timestamp.toISOString() ?? null,
      accessSuccessToday: successToday,
      accessFailedToday: failedToday,
      locksOnline,
      locksOffline,
      avgBatteryLevel: batteryAgg._avg.batteryLevel,
      lastSyncAt: lastProviderSync?.lastSync?.toISOString() ?? null,
    };
  },

  async list(tenantId: string, filters?: { status?: AccessCredentialStatus; roomId?: string }) {
    const rows = await prisma.accessCredential.findMany({
      where: {
        tenantId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.roomId ? { roomId: filters.roomId } : {}),
      },
      include: credentialInclude,
      orderBy: [{ status: "asc" }, { validUntil: "desc" }],
    });
    return rows.map(mapCredential);
  },

  async getById(tenantId: string, id: string) {
    const row = await prisma.accessCredential.findFirst({
      where: { id, tenantId },
      include: credentialInclude,
    });
    return row ? mapCredential(row) : null;
  },

  async createCredential(params: {
    tenantId: string;
    reservationId: string;
    roomId: string;
    guestId: string;
    guestName: string;
    roomCode: string;
    credentialType: AccessCredentialType;
    providerName?: string;
    validFrom: Date;
    validUntil: Date;
    actor?: MobileAccessActor;
    hotelKeycardId?: string;
  }) {
    const providerName = (params.providerName ?? "internal") as LockVendorId;
    const provider = await resolveProvider(params.tenantId, providerName);
    const doorLock = await ensureDoorLock(params.tenantId, params.roomId, provider.id);

    const adapter = getLockAdapter(providerName);
    const issue = await adapter.issueCredential({
      tenantId: params.tenantId,
      providerName,
      roomCode: params.roomCode,
      reservationId: params.reservationId,
      guestId: params.guestId,
      guestName: params.guestName,
      credentialType: params.credentialType,
      validFrom: params.validFrom,
      validUntil: params.validUntil,
      hotelIdentifier: provider.hotelIdentifier,
    });

    const linkToken = DIGITAL_ACCESS_TYPES.includes(params.credentialType)
      ? generateSecureToken()
      : null;

    const row = await prisma.accessCredential.create({
      data: {
        tenantId: params.tenantId,
        reservationId: params.reservationId,
        guestId: params.guestId,
        roomId: params.roomId,
        credentialType: params.credentialType,
        provider: providerName,
        lockId: doorLock.id,
        providerId: provider.id,
        encryptedCredential: issue.encryptedPayload ?? (issue.success ? encryptSecret("{}") : null),
        publicKey: issue.publicKey ?? null,
        accessTokenEnc: issue.accessToken ? encryptSecret(issue.accessToken) : null,
        walletTokenEnc: issue.walletToken ? encryptSecret(issue.walletToken) : null,
        qrTokenEnc: issue.qrToken ? encryptSecret(issue.qrToken) : null,
        secureLinkHash: linkToken ? hashSecureToken(linkToken) : null,
        status: issue.success ? "active" : "pending",
        validFrom: params.validFrom,
        validUntil: params.validUntil,
        issuedBy: params.actor?.userName ?? params.actor?.userId ?? "system",
        hotelKeycardId: params.hotelKeycardId ?? null,
      },
      include: credentialInclude,
    });

    await writeAudit(params.tenantId, "credential_created", params.actor, {
      credentialId: row.id,
      reservationId: params.reservationId,
      detail: `${params.credentialType}:${providerName}`,
    });

    await prisma.doorAccessLog.create({
      data: {
        tenantId: params.tenantId,
        credentialId: row.id,
        roomId: params.roomId,
        action: "issue",
        result: issue.success ? "success" : "failed",
        providerResponse: issue.errorMessage ?? issue.externalCredentialId ?? null,
        device: "pms",
        ipAddress: params.actor?.ip ?? null,
      },
    });

    return { credential: mapCredential(row), secureLinkToken: linkToken };
  },

  async revokeCredential(tenantId: string, credentialId: string, actor?: MobileAccessActor) {
    const existing = await prisma.accessCredential.findFirst({
      where: { id: credentialId, tenantId },
      include: { room: { select: { code: true } } },
    });
    if (!existing) throw new Error("Credenziale non trovata");
    if (existing.status === "revoked") return mapCredential(existing);

    const adapter = getLockAdapter(existing.provider);
    const externalId = existing.encryptedCredential
      ? decryptSecret(existing.encryptedCredential).slice(0, 64)
      : existing.id;
    await adapter.revokeCredential({
      tenantId,
      providerName: existing.provider as LockVendorId,
      externalCredentialId: externalId,
      roomCode: existing.room?.code ?? "",
    });

    const row = await prisma.accessCredential.update({
      where: { id: credentialId },
      data: {
        status: "revoked",
        revokedAt: new Date(),
        revokedBy: actor?.userName ?? actor?.userId ?? "system",
      },
      include: credentialInclude,
    });

    await writeAudit(tenantId, "credential_revoked", actor, {
      credentialId,
      reservationId: existing.reservationId,
    });

    await prisma.doorAccessLog.create({
      data: {
        tenantId,
        credentialId,
        roomId: existing.roomId,
        action: "revoke",
        result: "success",
        device: "pms",
        ipAddress: actor?.ip ?? null,
      },
    });

    return mapCredential(row);
  },

  async regenerateCredential(tenantId: string, credentialId: string, actor?: MobileAccessActor) {
    const existing = await prisma.accessCredential.findFirst({
      where: { id: credentialId, tenantId },
      include: { reservation: { select: { guestName: true } }, room: { select: { code: true } } },
    });
    if (!existing) throw new Error("Credenziale non trovata");

    await this.revokeCredential(tenantId, credentialId, actor);

    return this.createCredential({
      tenantId,
      reservationId: existing.reservationId,
      roomId: existing.roomId,
      guestId: existing.guestId,
      guestName: existing.reservation.guestName,
      roomCode: existing.room.code,
      credentialType: existing.credentialType,
      providerName: existing.provider,
      validFrom: new Date(),
      validUntil: existing.validUntil,
      actor,
      hotelKeycardId: existing.hotelKeycardId ?? undefined,
    });
  },

  async sendCredential(
    tenantId: string,
    credentialId: string,
    channel: MobileAccessDeliveryChannel,
    actor?: MobileAccessActor,
  ) {
    const cred = await prisma.accessCredential.findFirst({
      where: { id: credentialId, tenantId },
      include: { reservation: { select: { guestName: true, email: true, phone: true } }, room: { select: { code: true } } },
    });
    if (!cred) throw new Error("Credenziale non trovata");

    const linkToken = generateSecureToken();
    const linkHash = hashSecureToken(linkToken);
    await prisma.accessCredential.update({
      where: { id: credentialId },
      data: { secureLinkHash: linkHash },
    });

    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://app.ristosimply.it";
    const secureUrl = `${origin}/api/mobile-access/guest-link?token=${linkToken}`;
    const message = `KeyKARD — Camera ${cred.room.code} · Valida fino al ${cred.validUntil.toISOString().slice(0, 16)}`;

    await writeAudit(tenantId, `credential_send_${channel}`, actor, {
      credentialId,
      reservationId: cred.reservationId,
      detail: channel,
    });

    return {
      channel,
      queued: true,
      preview: message,
      secureUrl,
      recipientEmail: cred.reservation.email,
      recipientPhone: cred.reservation.phone,
      walletReady: cred.credentialType === "APPLE_WALLET" || cred.credentialType === "GOOGLE_WALLET",
    };
  },

  async listLogs(tenantId: string, limit = 100): Promise<DoorAccessLogEntry[]> {
    const rows = await prisma.doorAccessLog.findMany({
      where: { tenantId },
      orderBy: { timestamp: "desc" },
      take: Math.min(limit, 500),
      include: {
        room: { select: { code: true } },
        credential: {
          select: {
            reservation: { select: { guestName: true } },
          },
        },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      credentialId: r.credentialId,
      roomId: r.roomId,
      roomCode: r.room.code,
      guestName: r.credential?.reservation.guestName,
      timestamp: r.timestamp.toISOString(),
      action: r.action,
      result: r.result,
      device: r.device,
      ipAddress: r.ipAddress,
    }));
  },

  async issueOnCheckIn(params: {
    tenantId: string;
    reservationId: string;
    roomId: string;
    guestId: string;
    guestName: string;
    roomCode: string;
    validFrom: Date;
    validUntil: Date;
    methods: AccessCredentialType[];
    actor?: MobileAccessActor;
    hotelKeycardId?: string;
    sendVia?: MobileAccessDeliveryChannel[];
  }) {
    const issued: AccessCredential[] = [];
    for (const method of params.methods) {
      const result = await this.createCredential({
        tenantId: params.tenantId,
        reservationId: params.reservationId,
        roomId: params.roomId,
        guestId: params.guestId,
        guestName: params.guestName,
        roomCode: params.roomCode,
        credentialType: method,
        validFrom: params.validFrom,
        validUntil: params.validUntil,
        actor: params.actor,
        hotelKeycardId: method === "RFID_CARD" ? params.hotelKeycardId : undefined,
      });
      issued.push(result.credential);
      if (params.sendVia?.length && DIGITAL_ACCESS_TYPES.includes(method)) {
        for (const ch of params.sendVia) {
          await this.sendCredential(params.tenantId, result.credential.id, ch, params.actor);
        }
      }
    }
    return issued;
  },

  async revokeOnCheckOut(tenantId: string, reservationId: string, actor?: MobileAccessActor) {
    const active = await prisma.accessCredential.findMany({
      where: {
        tenantId,
        reservationId,
        status: { in: ["active", "pending"] },
      },
    });
    const revoked: AccessCredential[] = [];
    for (const cred of active) {
      revoked.push(await this.revokeCredential(tenantId, cred.id, actor));
    }
    return revoked;
  },
};
