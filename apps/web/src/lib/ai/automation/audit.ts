import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import type {
  AutomationAuditEntry,
  AutomationModule,
  AutomationRunRecord,
  AutomationRunStatus,
  AutomationTriggerType,
  AutomationLevel,
} from "@/lib/ai/automation/types";

function mapRun(row: {
  id: string;
  tenantId: string;
  workflowId: string;
  module: string;
  triggerType: string;
  status: string;
  level: number;
  idempotencyKey: string;
  context: unknown;
  dataUsed: unknown;
  aiReasoning: string | null;
  confidence: number | null;
  motivation: string | null;
  proposalId: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  executedActions: unknown;
  rollbackPayload: unknown;
  errorMessage: string | null;
  triggeredBy: string;
  startedAt: Date;
  finishedAt: Date | null;
}): AutomationRunRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workflowId: row.workflowId,
    module: row.module as AutomationModule,
    triggerType: row.triggerType as AutomationTriggerType,
    status: row.status as AutomationRunRecord["status"],
    level: Math.min(3, Math.max(1, row.level)) as AutomationLevel,
    idempotencyKey: row.idempotencyKey,
    context: (row.context ?? {}) as Record<string, unknown>,
    dataUsed: Array.isArray(row.dataUsed) ? (row.dataUsed as string[]) : [],
    aiReasoning: row.aiReasoning,
    confidence: row.confidence,
    motivation: row.motivation,
    proposalId: row.proposalId,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    executedActions: Array.isArray(row.executedActions) ? row.executedActions : [],
    rollbackPayload: row.rollbackPayload ?? null,
    errorMessage: row.errorMessage,
    triggeredBy: row.triggeredBy,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
  };
}

export const automationAudit = {
  async createRun(params: {
    tenantId: string;
    workflowId: string;
    module: AutomationModule;
    triggerType: AutomationTriggerType;
    level: AutomationLevel;
    idempotencyKey: string;
    triggeredBy: string;
    context: Record<string, unknown>;
    dataUsed?: string[];
  }): Promise<AutomationRunRecord> {
    const row = await prisma.aiAutomationRun.create({
      data: {
        tenantId: params.tenantId,
        workflowId: params.workflowId,
        module: params.module,
        triggerType: params.triggerType,
        status: "pending",
        level: params.level,
        idempotencyKey: params.idempotencyKey,
        context: params.context as Prisma.InputJsonValue,
        dataUsed: (params.dataUsed ?? []) as Prisma.InputJsonValue,
        triggeredBy: params.triggeredBy,
      },
    });
    await this.logEvent({
      runId: row.id,
      tenantId: params.tenantId,
      event: "run_created",
      payload: { trigger: params.triggerType, workflowId: params.workflowId },
      userId: params.triggeredBy !== "scheduler" ? params.triggeredBy : null,
    });
    return mapRun(row);
  },

  async findByIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<AutomationRunRecord | null> {
    const row = await prisma.aiAutomationRun.findFirst({
      where: {
        tenantId,
        idempotencyKey,
        status: { in: ["completed", "awaiting_approval", "running"] },
        startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    return row ? mapRun(row) : null;
  },

  async updateRun(
    runId: string,
    patch: Partial<{
      status: AutomationRunStatus;
      aiReasoning: string | null;
      confidence: number | null;
      motivation: string | null;
      proposalId: string | null;
      approvedBy: string | null;
      approvedAt: Date;
      executedActions: unknown[];
      rollbackPayload: unknown;
      errorMessage: string | null;
      finishedAt: Date;
      context: Record<string, unknown>;
    }>,
  ): Promise<AutomationRunRecord> {
    const row = await prisma.aiAutomationRun.update({
      where: { id: runId },
      data: {
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.aiReasoning !== undefined ? { aiReasoning: patch.aiReasoning } : {}),
        ...(patch.confidence !== undefined ? { confidence: patch.confidence } : {}),
        ...(patch.motivation !== undefined ? { motivation: patch.motivation } : {}),
        ...(patch.proposalId !== undefined ? { proposalId: patch.proposalId } : {}),
        ...(patch.approvedBy !== undefined ? { approvedBy: patch.approvedBy } : {}),
        ...(patch.approvedAt !== undefined ? { approvedAt: patch.approvedAt } : {}),
        ...(patch.executedActions !== undefined
          ? { executedActions: patch.executedActions as Prisma.InputJsonValue }
          : {}),
        ...(patch.rollbackPayload !== undefined
          ? { rollbackPayload: patch.rollbackPayload as Prisma.InputJsonValue }
          : {}),
        ...(patch.errorMessage !== undefined ? { errorMessage: patch.errorMessage } : {}),
        ...(patch.finishedAt !== undefined ? { finishedAt: patch.finishedAt } : {}),
        ...(patch.context !== undefined ? { context: patch.context as Prisma.InputJsonValue } : {}),
      },
    });
    return mapRun(row);
  },

  async logEvent(params: {
    runId: string;
    tenantId: string;
    event: string;
    payload?: Record<string, unknown>;
    userId?: string | null;
  }): Promise<AutomationAuditEntry> {
    const row = await prisma.aiAutomationAuditLog.create({
      data: {
        runId: params.runId,
        tenantId: params.tenantId,
        event: params.event,
        payload: (params.payload ?? {}) as Prisma.InputJsonValue,
        userId: params.userId ?? null,
      },
    });
    return {
      id: row.id,
      runId: row.runId,
      tenantId: row.tenantId,
      event: row.event,
      payload: (row.payload ?? {}) as Record<string, unknown>,
      userId: row.userId,
      createdAt: row.createdAt.toISOString(),
    };
  },

  async listRuns(tenantId: string, limit = 50): Promise<AutomationRunRecord[]> {
    const rows = await prisma.aiAutomationRun.findMany({
      where: { tenantId },
      orderBy: { startedAt: "desc" },
      take: Math.min(200, Math.max(1, limit)),
    });
    return rows.map(mapRun);
  },

  async getRun(runId: string, tenantId: string): Promise<AutomationRunRecord | null> {
    const row = await prisma.aiAutomationRun.findFirst({ where: { id: runId, tenantId } });
    return row ? mapRun(row) : null;
  },

  async listAuditLog(runId: string, tenantId: string): Promise<AutomationAuditEntry[]> {
    const rows = await prisma.aiAutomationAuditLog.findMany({
      where: { runId, tenantId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      runId: r.runId,
      tenantId: r.tenantId,
      event: r.event,
      payload: (r.payload ?? {}) as Record<string, unknown>,
      userId: r.userId,
      createdAt: r.createdAt.toISOString(),
    }));
  },
};
