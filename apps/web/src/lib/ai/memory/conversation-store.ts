import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

export type MemoryChannel = "chat" | "voice" | "orchestrator" | "module" | "decisions" | "vision";

export type UserMemoryProfile = {
  tenantId: string;
  userId: string;
  preferences: Record<string, unknown>;
  lastContext: string;
  summary: string;
  updatedAt: string;
};

export type MemoryTurnRecord = {
  id: string;
  tenantId: string;
  userId: string;
  channel: MemoryChannel;
  context: string;
  userMessage: string;
  assistantMessage: string | null;
  toolsUsed: string[];
  aiDecisions: unknown[];
  metadata: Record<string, unknown>;
  createdAt: string;
};

function mapProfile(row: {
  tenantId: string;
  userId: string;
  preferences: unknown;
  lastContext: string;
  summary: string;
  updatedAt: Date;
}): UserMemoryProfile {
  return {
    tenantId: row.tenantId,
    userId: row.userId,
    preferences: (row.preferences ?? {}) as Record<string, unknown>,
    lastContext: row.lastContext,
    summary: row.summary,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapTurn(row: {
  id: string;
  tenantId: string;
  userId: string;
  channel: string;
  context: string;
  userMessage: string;
  assistantMessage: string | null;
  toolsUsed: unknown;
  aiDecisions: unknown;
  metadata: unknown;
  createdAt: Date;
}): MemoryTurnRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    channel: row.channel as MemoryChannel,
    context: row.context,
    userMessage: row.userMessage,
    assistantMessage: row.assistantMessage,
    toolsUsed: Array.isArray(row.toolsUsed) ? (row.toolsUsed as string[]) : [],
    aiDecisions: Array.isArray(row.aiDecisions) ? row.aiDecisions : [],
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  };
}

export const conversationStore = {
  async getOrCreateProfile(tenantId: string, userId: string): Promise<UserMemoryProfile> {
    const existing = await prisma.aiUserMemoryProfile.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    if (existing) return mapProfile(existing);

    const created = await prisma.aiUserMemoryProfile.create({
      data: { tenantId, userId },
    });
    return mapProfile(created);
  },

  async updateProfile(
    tenantId: string,
    userId: string,
    patch: {
      preferences?: Record<string, unknown>;
      lastContext?: string;
      summary?: string;
    },
  ): Promise<UserMemoryProfile> {
    await this.getOrCreateProfile(tenantId, userId);
    const row = await prisma.aiUserMemoryProfile.update({
      where: { tenantId_userId: { tenantId, userId } },
      data: {
        ...(patch.preferences !== undefined ? { preferences: patch.preferences as Prisma.InputJsonValue } : {}),
        ...(patch.lastContext !== undefined ? { lastContext: patch.lastContext } : {}),
        ...(patch.summary !== undefined ? { summary: patch.summary } : {}),
      },
    });
    return mapProfile(row);
  },

  async appendTurn(params: {
    tenantId: string;
    userId: string;
    channel: MemoryChannel;
    context: string;
    userMessage: string;
    assistantMessage?: string | null;
    toolsUsed?: string[];
    aiDecisions?: unknown[];
    metadata?: Record<string, unknown>;
  }): Promise<MemoryTurnRecord> {
    const row = await prisma.aiMemoryTurn.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        channel: params.channel,
        context: params.context,
        userMessage: params.userMessage,
        assistantMessage: params.assistantMessage ?? null,
        toolsUsed: (params.toolsUsed ?? []) as Prisma.InputJsonValue,
        aiDecisions: (params.aiDecisions ?? []) as Prisma.InputJsonValue,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    await prisma.aiUserMemoryProfile.updateMany({
      where: { tenantId: params.tenantId, userId: params.userId },
      data: { lastContext: params.context },
    });

    return mapTurn(row);
  },

  async listTurns(tenantId: string, userId: string, limit = 30): Promise<MemoryTurnRecord[]> {
    const rows = await prisma.aiMemoryTurn.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: "desc" },
      take: Math.min(100, Math.max(1, limit)),
    });
    return rows.map(mapTurn);
  },

  async deleteTurnsBefore(tenantId: string, userId: string, before: Date): Promise<number> {
    const result = await prisma.aiMemoryTurn.deleteMany({
      where: { tenantId, userId, createdAt: { lt: before } },
    });
    return result.count;
  },

  async countTurns(tenantId: string, userId: string): Promise<number> {
    return prisma.aiMemoryTurn.count({ where: { tenantId, userId } });
  },
};
