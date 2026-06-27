export { automationEngine } from "@/lib/ai/automation/automation-engine";
export type { RunAutomationEngineParams } from "@/lib/ai/automation/automation-engine";

export { workflowRunner } from "@/lib/ai/automation/workflow-runner";
export type { WorkflowRunParams } from "@/lib/ai/automation/workflow-runner";

export { evaluateTriggers, getFiredTriggers } from "@/lib/ai/automation/trigger-manager";

export { automationActionExecutor } from "@/lib/ai/automation/action-executor";

export { automationApproval } from "@/lib/ai/automation/approval-manager";

export { automationNotifications } from "@/lib/ai/automation/notification-manager";
export type { AutomationNotificationParams, NotificationChannel } from "@/lib/ai/automation/notification-manager";

export { automationScheduler } from "@/lib/ai/automation/scheduler";
export type { SchedulerRunResult } from "@/lib/ai/automation/scheduler";

export { automationAudit } from "@/lib/ai/automation/audit";

export { automationConfigStore, WORKFLOW_CATALOG, findWorkflowForTrigger } from "@/lib/ai/automation/config-store";

export {
  AUTOMATION_TRIGGERS,
  AUTOMATION_MODULES,
  TRIGGER_TO_MODULE,
  MODULE_DECISION_DOMAIN,
  DEFAULT_TRIGGER_THRESHOLDS,
  buildIdempotencyKey,
  isAutomationEnabled,
} from "@/lib/ai/automation/types";
export type {
  AutomationTriggerType,
  AutomationModule,
  AutomationLevel,
  AutomationConfig,
  AutomationRunRecord,
  AutomationAuditEntry,
  AutomationEngineResult,
  TriggerEvaluation,
  WorkflowDefinition,
  ActionExecutionResult,
} from "@/lib/ai/automation/types";
