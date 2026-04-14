import { prisma } from "@/lib/db/prisma";

export const aiChatRepository = {
  async log(params: {
    tenantId: string;
    userId: string;
    context: string;
    userMessage: string;
    assistantMessage?: string | null;
    errorMessage?: string | null;
  }) {
    return prisma.aiChatLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        context: params.context,
        userMessage: params.userMessage,
        assistantMessage: params.assistantMessage ?? null,
        errorMessage: params.errorMessage ?? null,
      },
    });
  },
  async list(tenantId: string, userId: string, context?: string) {
    return prisma.aiChatLog.findMany({
      where: {
        tenantId,
        userId,
        ...(context ? { context } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        context: true,
        userMessage: true,
        assistantMessage: true,
        errorMessage: true,
        createdAt: true,
      },
    });
  },
};
