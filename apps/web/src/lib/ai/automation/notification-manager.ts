import { prisma } from "@/lib/db/prisma";
import { fireAndForget } from "@/lib/api/helpers";
import { sendTenantMail } from "@/lib/email/send-tenant-mail";
import type { AutomationModule } from "@/lib/ai/automation/types";
import type { WorkflowDefinition } from "@/lib/ai/automation/types";
import { AUTOMATION_NAV_HREF } from "@/lib/ai/module-ids";

const ROLE_TARGETS: Record<string, string[]> = {
  supervisor: ["supervisor", "owner"],
  owner: ["owner"],
  manager: ["supervisor", "owner", "hotel_manager"],
  reception: ["reception", "hotel_manager"],
  chef: ["cucina"],
  magazzino: ["magazzino", "cucina"],
  hotel_manager: ["hotel_manager", "reception"],
};

const MODULE_HREF: Partial<Record<AutomationModule, string>> = AUTOMATION_NAV_HREF;

export type NotificationChannel = "dashboard" | "email" | "push" | "chat";

export type AutomationNotificationParams = {
  tenantId: string;
  runId: string;
  module: AutomationModule;
  workflow: WorkflowDefinition;
  title: string;
  message: string;
  severity?: "info" | "warning" | "critical";
  channels?: NotificationChannel[];
  proposalId?: string | null;
};

async function resolveUserIds(tenantId: string, roles: string[]): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { tenantId, role: { in: roles } },
    select: { id: true, email: true, role: true },
  });
  return users.map((u) => u.id);
}

async function resolveEmails(tenantId: string, roles: string[]): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { tenantId, role: { in: roles } },
    select: { email: true },
  });
  return users.map((u) => u.email).filter(Boolean);
}

export const automationNotifications = {
  async notify(params: AutomationNotificationParams): Promise<{ dashboard: number; email: boolean }> {
    const channels = params.channels ?? ["dashboard", "email"];
    const roles = params.workflow.notifyRoles.flatMap((r) => ROLE_TARGETS[r] ?? [r]);
    const uniqueRoles = [...new Set(roles)];
    const href =
      params.proposalId
        ? `/supervisor?proposal=${params.proposalId}`
        : MODULE_HREF[params.module] ?? "/dashboard";

    let dashboardCount = 0;

    if (channels.includes("dashboard") || channels.includes("push") || channels.includes("chat")) {
      const userIds = await resolveUserIds(params.tenantId, uniqueRoles);
      for (const userId of userIds) {
        fireAndForget(
          prisma.notification.create({
            data: {
              tenantId: params.tenantId,
              userId,
              type: "automazione_ai",
              title: params.title,
              message: params.message,
              href,
            },
          }),
          "automation-notification",
        );
        dashboardCount += 1;
      }

      if (userIds.length === 0) {
        fireAndForget(
          prisma.notification.create({
            data: {
              tenantId: params.tenantId,
              type: "automazione_ai",
              title: params.title,
              message: params.message,
              href,
            },
          }),
          "automation-notification-broadcast",
        );
        dashboardCount = 1;
      }
    }

    let emailSent = false;
    if (channels.includes("email")) {
      const emails = await resolveEmails(params.tenantId, uniqueRoles);
      if (emails.length > 0) {
        const result = await sendTenantMail({
          tenantId: params.tenantId,
          to: emails,
          subject: `[RistoSimply AI] ${params.title}`,
          text: params.message,
          html: `<p>${params.message.replace(/\n/g, "<br/>")}</p><p><a href="${href}">Apri in gestionale</a></p>`,
        });
        emailSent = result.ok;
      }
    }

    return { dashboard: dashboardCount, email: emailSent };
  },

  levelLabel(level: number): string {
    if (level === 1) return "Suggerimento AI";
    if (level === 3) return "Esecuzione automatica";
    return "Approvazione richiesta";
  },
};
