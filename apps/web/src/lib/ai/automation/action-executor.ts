import { executeRistoTool } from "@/lib/ai/risto-tools";
import { sendTenantMail } from "@/lib/email/send-tenant-mail";
import { prisma } from "@/lib/db/prisma";
import type { ActionExecutionResult } from "@/lib/ai/automation/types";
import type { AutomationRunRecord } from "@/lib/ai/automation/types";
import { automationAudit } from "@/lib/ai/automation/audit";

export type ExecuteWorkflowActionsParams = {
  tenantId: string;
  run: AutomationRunRecord;
  module: string;
};

export const automationActionExecutor = {
  async executeMagazzinoOrder(params: ExecuteWorkflowActionsParams): Promise<ActionExecutionResult[]> {
    const context = params.run.context;
    const items = (context.items as Array<{ name: string; suggestedOrderQty?: number; qty?: number; unit?: string }>) ?? [];
    if (items.length === 0) {
      return [{ actionType: "supplier_order", success: false, message: "Nessun articolo da ordinare" }];
    }

    const top = items[0];
    const toolResult = await executeRistoTool(
      "prepare_supplier_order",
      {
        supplierName: String((top as { supplier?: string }).supplier ?? ""),
        notes: `Automazione AI run ${params.run.id} — ${top.name}`,
      },
      params.tenantId,
    );

    const results: ActionExecutionResult[] = [
      {
        actionType: "prepare_supplier_order",
        success: toolResult.success,
        message: toolResult.message,
        data: toolResult.data,
        rollback: toolResult.success ? { tool: "prepare_supplier_order", note: params.run.id } : undefined,
      },
    ];

    if (toolResult.success) {
      const ownerEmails = await prisma.user.findMany({
        where: { tenantId: params.tenantId, role: { in: ["owner", "supervisor", "magazzino"] } },
        select: { email: true },
        take: 5,
      });
      if (ownerEmails.length > 0) {
        const mail = await sendTenantMail({
          tenantId: params.tenantId,
          to: ownerEmails.map((u) => u.email),
          subject: `Ordine fornitore — automazione magazzino`,
          text: toolResult.message,
        });
        results.push({
          actionType: "email_internal",
          success: mail.ok,
          message: mail.ok ? "Notifica email interna inviata" : `Email non inviata: ${mail.ok ? "" : mail.reason}`,
        });
      }
    }

    return results;
  },

  async executeForRun(params: ExecuteWorkflowActionsParams): Promise<ActionExecutionResult[]> {
    switch (params.module) {
      case "magazzino":
        return this.executeMagazzinoOrder(params);
      default:
        return [
          {
            actionType: "noop",
            success: true,
            message: `Modulo ${params.module}: esecuzione automatica non configurata (solo proposta/notifica)`,
          },
        ];
    }
  },

  async applyApprovedRun(params: {
    tenantId: string;
    run: AutomationRunRecord;
  }): Promise<{ results: ActionExecutionResult[]; run: AutomationRunRecord }> {
    const results = await this.executeForRun({
      tenantId: params.tenantId,
      run: params.run,
      module: params.run.module,
    });

    const rollbackPayload = results
      .filter((r) => r.rollback)
      .map((r) => ({ actionType: r.actionType, rollback: r.rollback }));

    const allOk = results.every((r) => r.success);
    const updated = await automationAudit.updateRun(params.run.id, {
      status: allOk ? "completed" : "failed",
      executedActions: results,
      rollbackPayload,
      finishedAt: new Date(),
      errorMessage: allOk ? null : results.filter((r) => !r.success).map((r) => r.message).join("; "),
    });

    await automationAudit.logEvent({
      runId: params.run.id,
      tenantId: params.tenantId,
      event: allOk ? "executed" : "execution_failed",
      payload: { results: results.map((r) => ({ type: r.actionType, success: r.success })) },
    });

    if (params.run.proposalId && allOk) {
      await prisma.aiProposal.updateMany({
        where: { id: params.run.proposalId, tenantId: params.tenantId },
        data: { status: "applied", appliedAt: new Date() },
      });
    }

    return { results, run: updated };
  },

  async rollbackRun(params: { tenantId: string; run: AutomationRunRecord }): Promise<AutomationRunRecord> {
    const rollbacks = Array.isArray(params.run.rollbackPayload) ? params.run.rollbackPayload : [];
    const results: ActionExecutionResult[] = [];

    for (const entry of rollbacks) {
      const item = entry as { actionType?: string; rollback?: Record<string, unknown> };
      if (item.rollback?.tool === "prepare_supplier_order") {
        results.push({
          actionType: "rollback_supplier_order",
          success: true,
          message: "Rollback registrato (ordine fornitore era informativo via tool)",
        });
      }
    }

    const updated = await automationAudit.updateRun(params.run.id, {
      status: "rolled_back",
      finishedAt: new Date(),
      executedActions: [...(params.run.executedActions as ActionExecutionResult[]), ...results],
    });

    await automationAudit.logEvent({
      runId: params.run.id,
      tenantId: params.tenantId,
      event: "rolled_back",
      payload: { results },
    });

    return updated;
  },
};
