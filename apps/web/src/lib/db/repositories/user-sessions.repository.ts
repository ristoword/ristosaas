import { prisma } from "@/lib/db/prisma";

export type UserSession = {
  id: string;
  userId: string;
  tenantId: string | null;
  jti: string;
  tokenType: "access" | "refresh";
  userAgent: string | null;
  ipAddress: string | null;
  issuedAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokedBy: string | null;
};

type RawRow = {
  id: string;
  userId: string;
  tenantId: string | null;
  jti: string;
  tokenType: string;
  userAgent: string | null;
  ipAddress: string | null;
  issuedAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedBy: string | null;
};

function mapRow(row: RawRow): UserSession {
  return {
    id: row.id,
    userId: row.userId,
    tenantId: row.tenantId,
    jti: row.jti,
    tokenType: row.tokenType === "refresh" ? "refresh" : "access",
    userAgent: row.userAgent,
    ipAddress: row.ipAddress,
    issuedAt: row.issuedAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
    revokedBy: row.revokedBy,
  };
}

export const userSessionsRepository = {
  async create(payload: {
    userId: string;
    tenantId: string | null;
    jti: string;
    tokenType?: "access" | "refresh";
    userAgent?: string | null;
    ipAddress?: string | null;
    expiresAt: Date;
  }): Promise<UserSession> {
    const row = await prisma.userSession.create({
      data: {
        userId: payload.userId,
        tenantId: payload.tenantId ?? null,
        jti: payload.jti,
        tokenType: payload.tokenType ?? "access",
        userAgent: payload.userAgent ?? null,
        ipAddress: payload.ipAddress ?? null,
        expiresAt: payload.expiresAt,
      },
    });
    return mapRow(row);
  },

  async findByJti(jti: string): Promise<UserSession | null> {
    const row = await prisma.userSession.findUnique({ where: { jti } });
    return row ? mapRow(row) : null;
  },

  async isActive(jti: string): Promise<boolean> {
    const row = await prisma.userSession.findUnique({ where: { jti } });
    if (!row) return false;
    if (row.revokedAt) return false;
    if (row.expiresAt.getTime() < Date.now()) return false;
    return true;
  },

  async touch(jti: string): Promise<void> {
    await prisma.userSession
      .update({ where: { jti }, data: { lastSeenAt: new Date() } })
      .catch(() => {
        // Session non presente: nessun side effect.
      });
  },

  async listActiveForUser(userId: string): Promise<UserSession[]> {
    const now = new Date();
    const rows = await prisma.userSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { lastSeenAt: "desc" },
    });
    return rows.map(mapRow);
  },

  async listAllForUser(userId: string, limit = 50): Promise<UserSession[]> {
    const rows = await prisma.userSession.findMany({
      where: { userId },
      orderBy: { issuedAt: "desc" },
      take: limit,
    });
    return rows.map(mapRow);
  },

  async listForTenant(tenantId: string, params?: { activeOnly?: boolean; limit?: number }): Promise<UserSession[]> {
    const where: { tenantId: string; revokedAt?: null; expiresAt?: { gt: Date } } = { tenantId };
    if (params?.activeOnly) {
      where.revokedAt = null;
      where.expiresAt = { gt: new Date() };
    }
    const rows = await prisma.userSession.findMany({
      where,
      orderBy: { lastSeenAt: "desc" },
      take: params?.limit ?? 200,
    });
    return rows.map(mapRow);
  },

  async revoke(jti: string, revokedBy: string): Promise<boolean> {
    const existing = await prisma.userSession.findUnique({ where: { jti } });
    if (!existing || existing.revokedAt) return false;
    await prisma.userSession.update({
      where: { jti },
      data: { revokedAt: new Date(), revokedBy },
    });
    return true;
  },

  async revokeById(id: string, revokedBy: string): Promise<UserSession | null> {
    const existing = await prisma.userSession.findUnique({ where: { id } });
    if (!existing) return null;
    if (existing.revokedAt) return mapRow(existing);
    const row = await prisma.userSession.update({
      where: { id },
      data: { revokedAt: new Date(), revokedBy },
    });
    return mapRow(row);
  },

  async revokeAllForUser(userId: string, revokedBy: string, exceptJti?: string): Promise<number> {
    const where: {
      userId: string;
      revokedAt: null;
      NOT?: { jti: string };
    } = {
      userId,
      revokedAt: null,
    };
    if (exceptJti) where.NOT = { jti: exceptJti };
    const result = await prisma.userSession.updateMany({
      where,
      data: { revokedAt: new Date(), revokedBy },
    });
    return result.count;
  },

  async purgeExpired(olderThanMs = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    const threshold = new Date(Date.now() - olderThanMs);
    const result = await prisma.userSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: threshold } },
          { revokedAt: { lt: threshold } },
        ],
      },
    });
    return result.count;
  },
};
