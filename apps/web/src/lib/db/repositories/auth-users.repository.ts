import { prisma } from "@/lib/db/prisma";
import type { PublicUser, UserRole } from "@/lib/auth/types";
import { hashPassword, isHashedPassword, verifyPassword } from "@/lib/auth/password";

type DbUser = {
  id: string;
  tenantId: string;
  username: string;
  passwordHash: string;
  name: string;
  role: string;
  email: string;
  sessionVersion: number;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
};

function isLocked(user: DbUser) {
  return !!(user.lockedUntil && user.lockedUntil.getTime() > Date.now());
}

function sanitizeUser(user: DbUser): PublicUser {
  return {
    id: user.id,
    tenantId: user.tenantId,
    username: user.username,
    name: user.name,
    role: user.role as UserRole,
    email: user.email,
    sessionVersion: user.sessionVersion,
    mustChangePassword: user.mustChangePassword,
    failedLoginAttempts: user.failedLoginAttempts,
    lockedUntil: user.lockedUntil ? user.lockedUntil.getTime() : null,
    isLocked: isLocked(user),
  };
}

function makeTempPassword() {
  return `Temp#${Math.random().toString(36).slice(2, 8)}${Date.now().toString().slice(-2)}`;
}

export const authUsersRepository = {
  sanitizeUser,
  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        username: true,
        passwordHash: true,
        name: true,
        role: true,
        email: true,
        sessionVersion: true,
        mustChangePassword: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });
    return user;
  },
  async findByUsername(username: string) {
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      select: {
        id: true,
        tenantId: true,
        username: true,
        passwordHash: true,
        name: true,
        role: true,
        email: true,
        sessionVersion: true,
        mustChangePassword: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });
    return user;
  },
  async registerFailedLogin(username: string) {
    const user = await this.findByUsername(username);
    if (!user) return { found: false as const, locked: false, attempt: 0, lockedSeconds: 0 };
    const attempt = (user.failedLoginAttempts || 0) + 1;
    const lockedUntil = attempt >= 5 ? new Date(Date.now() + 5 * 60 * 1000) : user.lockedUntil;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempt,
        lockedUntil,
      },
    });
    const locked = !!(lockedUntil && lockedUntil.getTime() > Date.now());
    const lockedSeconds = locked && lockedUntil ? Math.ceil((lockedUntil.getTime() - Date.now()) / 1000) : 0;
    return { found: true as const, locked, attempt, lockedSeconds };
  },
  async clearLoginFailures(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
  },
  async unlockUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
      select: {
        id: true,
        tenantId: true,
        username: true,
        passwordHash: true,
        name: true,
        role: true,
        email: true,
        sessionVersion: true,
        mustChangePassword: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });
    return sanitizeUser(updated);
  },
  async generateTemporaryPassword(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    const temporaryPassword = makeTempPassword();
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashPassword(temporaryPassword),
        sessionVersion: { increment: 1 },
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      select: {
        id: true,
        tenantId: true,
        username: true,
        passwordHash: true,
        name: true,
        role: true,
        email: true,
        sessionVersion: true,
        mustChangePassword: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });
    return { user: sanitizeUser(updated), temporaryPassword };
  },
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.findById(userId);
    if (!user) return { ok: false as const, reason: "not_found" as const };
    if (!verifyPassword(user.passwordHash, currentPassword)) return { ok: false as const, reason: "wrong_password" as const };
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashPassword(newPassword),
        sessionVersion: { increment: 1 },
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      select: {
        id: true,
        tenantId: true,
        username: true,
        passwordHash: true,
        name: true,
        role: true,
        email: true,
        sessionVersion: true,
        mustChangePassword: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });
    return { ok: true as const, user: sanitizeUser(updated) };
  },
  async listUsers(params?: { tenantId?: string; limit?: number; offset?: number }) {
    const limit = Math.max(1, Math.min(200, Math.floor(params?.limit ?? 100)));
    const offset = Math.max(0, Math.floor(params?.offset ?? 0));
    const users = await prisma.user.findMany({
      where: params?.tenantId ? { tenantId: params.tenantId } : undefined,
      skip: offset,
      take: limit,
      orderBy: { username: "asc" },
      select: {
        id: true,
        tenantId: true,
        username: true,
        passwordHash: true,
        name: true,
        role: true,
        email: true,
        sessionVersion: true,
        mustChangePassword: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });
    return users.map(sanitizeUser);
  },
  async validateCredentials(username: string, plainPassword: string) {
    const user = await this.findByUsername(username);
    if (!user) return null;
    if (!verifyPassword(user.passwordHash, plainPassword)) return null;

    if (!isHashedPassword(user.passwordHash)) {
      const migratedHash = hashPassword(plainPassword);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: migratedHash },
      });
      return {
        ...user,
        passwordHash: migratedHash,
      };
    }

    return user;
  },
  async isSessionVersionValid(userId: string, sessionVersion: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { sessionVersion: true },
    });
    if (!user) return false;
    return user.sessionVersion === sessionVersion;
  },
};
