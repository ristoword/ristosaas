import { prisma } from "@/lib/db/prisma";

const ONLINE_THRESHOLD_MINUTES = 15;

export type UserAccessRow = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  createdAt: string;
  lastLoginAt: string | null;
  lastSessionSeenAt: string | null;
  hasLoggedIn: boolean;
  isOnline: boolean;
  mustChangePassword: boolean;
  isLocked: boolean;
  failedLoginAttempts: number;
};

export type UserAccessReport = {
  summary: {
    total: number;
    loggedIn: number;
    neverLoggedIn: number;
    onlineNow: number;
    thresholdMinutes: number;
  };
  users: UserAccessRow[];
  generatedAt: string;
};

function isLocked(lockedUntil: Date | null, failedLoginAttempts: number) {
  return !!(lockedUntil && lockedUntil.getTime() > Date.now()) || failedLoginAttempts >= 5;
}

export async function getUserAccessReport(): Promise<UserAccessReport> {
  const now = new Date();
  const threshold = new Date(now.getTime() - ONLINE_THRESHOLD_MINUTES * 60_000);

  const [users, onlineSessions] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ tenant: { name: "asc" } }, { username: "asc" }],
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
        createdAt: true,
        lastLoginAt: true,
        mustChangePassword: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        tenant: { select: { name: true, slug: true } },
        sessions: {
          where: { revokedAt: null },
          orderBy: { lastSeenAt: "desc" },
          take: 1,
          select: { lastSeenAt: true },
        },
      },
    }),
    prisma.userSession.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: now },
        lastSeenAt: { gte: threshold },
      },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);

  const onlineUserIds = new Set(onlineSessions.map((s) => s.userId));

  const rows: UserAccessRow[] = users.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email,
    role: u.role,
    tenantId: u.tenantId,
    tenantName: u.tenant.name,
    tenantSlug: u.tenant.slug,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    lastSessionSeenAt: u.sessions[0]?.lastSeenAt?.toISOString() ?? null,
    hasLoggedIn: u.lastLoginAt != null,
    isOnline: onlineUserIds.has(u.id),
    mustChangePassword: u.mustChangePassword,
    isLocked: isLocked(u.lockedUntil, u.failedLoginAttempts),
    failedLoginAttempts: u.failedLoginAttempts,
  }));

  return {
    summary: {
      total: rows.length,
      loggedIn: rows.filter((r) => r.hasLoggedIn).length,
      neverLoggedIn: rows.filter((r) => !r.hasLoggedIn).length,
      onlineNow: rows.filter((r) => r.isOnline).length,
      thresholdMinutes: ONLINE_THRESHOLD_MINUTES,
    },
    users: rows,
    generatedAt: now.toISOString(),
  };
}
