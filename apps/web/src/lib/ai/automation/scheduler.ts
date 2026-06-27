import { prisma } from "@/lib/db/prisma";
import { sendOperationalAlert } from "@/lib/observability/alerts";
import { automationEngine } from "@/lib/ai/automation/automation-engine";
import { automationConfigStore } from "@/lib/ai/automation/config-store";
import type { AutomationEngineResult } from "@/lib/ai/automation/types";
import { isAutomationEnabled } from "@/lib/ai/automation/types";

export type SchedulerRunResult = {
  tenants: number;
  totalRuns: number;
  completed: number;
  failed: number;
  skipped: number;
  byTenant: Array<{ tenantId: string; result: AutomationEngineResult }>;
};

export const automationScheduler = {
  async runForAllTenants(options?: { tenantIds?: string[] }): Promise<SchedulerRunResult> {
    if (!isAutomationEnabled()) {
      return { tenants: 0, totalRuns: 0, completed: 0, failed: 0, skipped: 0, byTenant: [] };
    }

    const tenants = options?.tenantIds?.length
      ? options.tenantIds.map((id) => ({ id }))
      : await prisma.tenant.findMany({ select: { id: true }, orderBy: { createdAt: "asc" } });

    const byTenant: SchedulerRunResult["byTenant"] = [];
    let totalRuns = 0;
    let completed = 0;
    let failed = 0;
    let skipped = 0;

    for (const tenant of tenants) {
      await automationConfigStore.list(tenant.id);
      const result = await automationEngine.run({
        tenantId: tenant.id,
        triggeredBy: "scheduler",
      });
      byTenant.push({ tenantId: tenant.id, result });
      totalRuns += result.runsStarted;
      completed += result.runsCompleted;
      failed += result.runsFailed;
      skipped += result.runsSkipped;
    }

    if (failed > 0) {
      await sendOperationalAlert({
        key: "ai-automation-scheduler",
        title: "Automation Engine: run completato con errori",
        message: `${failed} workflow falliti su ${tenants.length} tenant.`,
        severity: "warning",
        metadata: { totalRuns, completed, failed, skipped },
      });
    }

    return {
      tenants: tenants.length,
      totalRuns,
      completed,
      failed,
      skipped,
      byTenant,
    };
  },

  async runForTenant(tenantId: string, triggeredBy = "scheduler"): Promise<AutomationEngineResult> {
    return automationEngine.run({ tenantId, triggeredBy });
  },
};
