import { sendOperationalAlert } from "@/lib/observability/alerts";
import { automationAudit } from "@/lib/ai/automation/audit";
import { automationConfigStore } from "@/lib/ai/automation/config-store";
import { evaluateTriggers, getFiredTriggers } from "@/lib/ai/automation/trigger-manager";
import { workflowRunner } from "@/lib/ai/automation/workflow-runner";
import { findWorkflowForTrigger } from "@/lib/ai/automation/config-store";
import type {
  AutomationEngineResult,
  AutomationModule,
  AutomationRunRecord,
  AutomationTriggerType,
} from "@/lib/ai/automation/types";
import { buildIdempotencyKey, isAutomationEnabled as automationEnabled } from "@/lib/ai/automation/types";

export type RunAutomationEngineParams = {
  tenantId: string;
  triggeredBy: string;
  userRole?: string;
  triggerFilter?: AutomationTriggerType[];
  moduleFilter?: AutomationModule;
  manual?: boolean;
  signal?: AbortSignal;
};

export const automationEngine = {
  async run(params: RunAutomationEngineParams): Promise<AutomationEngineResult> {
    if (!automationEnabled()) {
      return {
        tenantId: params.tenantId,
        runsStarted: 0,
        runsCompleted: 0,
        runsSkipped: 0,
        runsFailed: 0,
        runs: [],
      };
    }

    const configs = await automationConfigStore.list(params.tenantId);
    const evaluations = await evaluateTriggers(params.tenantId, {
      triggerFilter: params.triggerFilter,
      configs,
    });

    let fired = getFiredTriggers(evaluations);
    if (params.moduleFilter) {
      fired = fired.filter((f) => f.module === params.moduleFilter);
    }

    const runs: AutomationRunRecord[] = [];
    let runsCompleted = 0;
    let runsSkipped = 0;
    let runsFailed = 0;

    for (const evaluation of fired) {
      const workflow = findWorkflowForTrigger(evaluation.trigger);
      if (!workflow) {
        runsSkipped += 1;
        continue;
      }

      const level = automationConfigStore.resolveLevel(configs, workflow.module, params.userRole);
      const idempotencyKey = buildIdempotencyKey(
        params.tenantId,
        evaluation.trigger,
        workflow.module,
        params.manual ? `manual-${Date.now()}` : undefined,
      );

      if (!params.manual) {
        const existing = await automationAudit.findByIdempotencyKey(params.tenantId, idempotencyKey);
        if (existing) {
          runsSkipped += 1;
          runs.push(existing);
          continue;
        }
      }

      const run = await automationAudit.createRun({
        tenantId: params.tenantId,
        workflowId: workflow.id,
        module: workflow.module,
        triggerType: evaluation.trigger,
        level,
        idempotencyKey,
        triggeredBy: params.triggeredBy,
        context: evaluation.context,
        dataUsed: evaluation.dataUsed,
      });

      const finished = await workflowRunner.run({
        tenantId: params.tenantId,
        triggeredBy: params.triggeredBy,
        userRole: params.userRole,
        evaluation,
        workflow,
        level,
        run,
        signal: params.signal,
      });

      runs.push(finished);
      if (finished.status === "completed" || finished.status === "awaiting_approval") runsCompleted += 1;
      else if (finished.status === "failed") runsFailed += 1;
      else runsSkipped += 1;
    }

    return {
      tenantId: params.tenantId,
      runsStarted: runs.length,
      runsCompleted,
      runsSkipped,
      runsFailed,
      runs,
    };
  },
};

export { isAutomationEnabled } from "@/lib/ai/automation/types";
