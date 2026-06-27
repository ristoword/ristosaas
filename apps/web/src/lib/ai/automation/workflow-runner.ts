import { generateSingleDomainDecision } from "@/lib/ai/decisions/orchestrator";
import { optimizeDecision } from "@/lib/ai/learning/optimizer";
import { runOrchestrator } from "@/lib/ai/orchestrator";
import { loadMemoryContext } from "@/lib/ai/memory/context-manager";
import { recordMemoryExchange } from "@/lib/ai/memory/context-manager";
import { automationActionExecutor } from "@/lib/ai/automation/action-executor";
import { automationApproval } from "@/lib/ai/automation/approval-manager";
import { automationAudit } from "@/lib/ai/automation/audit";
import { automationConfigStore, findWorkflowForTrigger } from "@/lib/ai/automation/config-store";
import { automationNotifications } from "@/lib/ai/automation/notification-manager";
import type {
  AutomationLevel,
  AutomationRunRecord,
  TriggerEvaluation,
  WorkflowDefinition,
} from "@/lib/ai/automation/types";
import { AUTOMATION_TIMEOUT_MS } from "@/lib/ai/automation/types";

export type WorkflowRunParams = {
  tenantId: string;
  triggeredBy: string;
  userRole?: string;
  evaluation: TriggerEvaluation;
  workflow: WorkflowDefinition;
  level: AutomationLevel;
  run: AutomationRunRecord;
  signal?: AbortSignal;
};

function withTimeout<T>(promise: Promise<T>, ms: number, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Automation timeout")), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

async function analyzeStep(params: WorkflowRunParams) {
  const { tenantId, workflow, evaluation, run } = params;

  let aiReasoning = "";
  let confidence: number | null = null;
  let motivation = evaluation.summary;
  let decisionDomain = workflow.decisionDomain;

  if (workflow.module === "supervisor" || workflow.module === "dashboard") {
    const orchestrated = await runOrchestrator({
      tenantId,
      userId: params.triggeredBy !== "scheduler" ? params.triggeredBy : undefined,
      request: { query: evaluation.summary, enrich: true, contextHint: evaluation.module },
      signal: params.signal,
    });
    aiReasoning = orchestrated.reply.slice(0, 4000);
    motivation = orchestrated.plan.reasoning || evaluation.summary;
    confidence = orchestrated.source === "rules+ai" ? 0.75 : 0.55;

    await automationAudit.logEvent({
      runId: run.id,
      tenantId,
      event: "orchestrator_analyzed",
      payload: { modules: orchestrated.plan.modules, ragUsed: orchestrated.ragUsed },
    });

    return { aiReasoning, confidence, motivation, orchestrated, decision: null };
  }

  if (decisionDomain) {
    const memory = await loadMemoryContext({
      tenantId,
      userId: params.triggeredBy !== "scheduler" ? params.triggeredBy : "system",
      query: evaluation.summary,
      context: workflow.module,
      channel: "module",
    });

    const raw = await generateSingleDomainDecision(tenantId, decisionDomain, {
      enrich: true,
      periodDays: 14,
    });
    const { decision } = await optimizeDecision(tenantId, raw);

    aiReasoning = decision.aiEnhanced?.motivation ?? decision.ruleBased.summary;
    confidence = decision.aiEnhanced?.confidence ?? 0.55;
    motivation = decision.aiEnhanced?.motivation ?? decision.ruleBased.summary;

    await automationAudit.logEvent({
      runId: run.id,
      tenantId,
      event: "decision_analyzed",
      payload: {
        domain: decisionDomain,
        memoryUsed: Boolean(memory?.promptBlock),
        ruleBased: decision.ruleBased.summary,
      },
    });

    return { aiReasoning, confidence, motivation, decision, orchestrated: null };
  }

  return { aiReasoning: evaluation.summary, confidence: 0.5, motivation, decision: null, orchestrated: null };
}

export const workflowRunner = {
  async run(params: WorkflowRunParams): Promise<AutomationRunRecord> {
    const { run, workflow, level, tenantId } = params;

    try {
      await automationAudit.updateRun(run.id, { status: "running" });

      const analysis = await withTimeout(analyzeStep(params), AUTOMATION_TIMEOUT_MS, params.signal);

      await automationAudit.updateRun(run.id, {
        aiReasoning: analysis.aiReasoning,
        confidence: analysis.confidence,
        motivation: analysis.motivation,
        context: { ...params.evaluation.context, analysis: { confidence: analysis.confidence } },
      });

      let proposalId: string | null = null;
      let approvalRequired = false;

      if (workflow.steps.some((s) => s.type === "propose") && analysis.decision) {
        const approval = await automationApproval.createProposalFromDecision({
          tenantId,
          createdBy: params.triggeredBy,
          decision: analysis.decision,
          level,
          runId: run.id,
        });
        proposalId = approval.proposalId;
        approvalRequired = approval.required;
      }

      const notifyTitle = `[${workflow.module}] ${params.evaluation.trigger}`;
      const notifyMsg = `${automationNotifications.levelLabel(level)}\n${analysis.motivation}`;

      if (workflow.steps.some((s) => s.type === "notify")) {
        await automationNotifications.notify({
          tenantId,
          runId: run.id,
          module: workflow.module,
          workflow,
          title: notifyTitle,
          message: notifyMsg,
          severity: params.evaluation.severity,
          proposalId,
        });
      }

      if (level === 3 && !approvalRequired && analysis.decision) {
        const current = await automationAudit.getRun(run.id, tenantId);
        if (current) {
          const executed = await automationActionExecutor.applyApprovedRun({ tenantId, run: current });
          await recordMemoryExchange({
            tenantId,
            userId: params.triggeredBy !== "scheduler" ? params.triggeredBy : "system",
            channel: "module",
            context: `automation:${workflow.module}`,
            userMessage: params.evaluation.summary,
            assistantMessage: analysis.motivation,
            metadata: { runId: run.id, level, auto: true },
          }).catch(() => undefined);
          return executed.run;
        }
      }

      if (level === 1) {
        const updated = await automationAudit.updateRun(run.id, {
          status: "completed",
          finishedAt: new Date(),
        });
        await automationAudit.logEvent({
          runId: run.id,
          tenantId,
          event: "suggestion_completed",
          payload: { level },
        });
        return updated;
      }

      const finalStatus = approvalRequired ? "awaiting_approval" : "completed";
      return automationAudit.updateRun(run.id, {
        status: finalStatus,
        finishedAt: finalStatus === "completed" ? new Date() : undefined,
        proposalId,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore workflow";
      return automationAudit.updateRun(run.id, {
        status: "failed",
        errorMessage: msg,
        finishedAt: new Date(),
      });
    }
  },

  async executeApproved(params: {
    tenantId: string;
    run: AutomationRunRecord;
    reviewerId: string;
  }): Promise<AutomationRunRecord> {
    const approved = await automationApproval.approveRun({
      tenantId: params.tenantId,
      run: params.run,
      reviewerId: params.reviewerId,
    });
    if (!approved) throw new Error("Approvazione fallita");

    const { run } = await automationActionExecutor.applyApprovedRun({
      tenantId: params.tenantId,
      run: approved,
    });
    return run;
  },
};
