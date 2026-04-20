import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { PublicUser } from "@/lib/auth/types";
import { clientIpFromRequest } from "@/lib/security/rate-limit";
import { logger } from "@/lib/observability/logger";

export type AdminAuditAction =
  | "platform.maintenance.toggle"
  | "tenant.create"
  | "tenant.update"
  | "tenant.access.block"
  | "tenant.access.unblock"
  | "tenant.license.create"
  | "tenant.license.update"
  | "tenant.license.reset"
  | "tenant.email.test"
  | "user.unlock"
  | "user.temp_password"
  | "user.role.change"
  | "signup.provision";

type AuditInput = {
  action: AdminAuditAction;
  actor: Pick<PublicUser, "id" | "role" | "email"> | null;
  tenantId?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  req?: NextRequest | Request;
};

/**
 * Record a sensitive admin-level operation to `AdminAuditLog`.
 *
 * Never throws: audit must not break the business path. Writes are
 * fire-and-forget at the call site (caller should `void` the promise).
 */
export async function recordAdminAudit(input: AuditInput) {
  const actorId = input.actor?.id ?? "system";
  const actorRole = input.actor?.role ?? "system";
  const actorEmail = input.actor?.email ?? null;

  let ipAddress: string | null = null;
  if (input.req) ipAddress = clientIpFromRequest(input.req);

  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId,
        actorRole,
        actorEmail: actorEmail ?? undefined,
        action: input.action,
        tenantId: input.tenantId ?? undefined,
        targetId: input.targetId ?? undefined,
        metadata: (input.metadata ?? null) as any,
        ipAddress: ipAddress ?? undefined,
      },
    });
  } catch (error) {
    logger.warn("admin_audit_write_failed", {
      action: input.action,
      actorId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
