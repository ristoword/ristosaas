import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { PublicUser } from "@/lib/auth/types";
import { clientIpFromRequest } from "@/lib/security/rate-limit";
import { logger } from "@/lib/observability/logger";

export type PartnerAuditAction =
  | "partner.login"
  | "partner.logout"
  | "partner.dashboard.view"
  | "partner.sales.view"
  | "partner.tenants.view"
  | "partner.stripe.view"
  | "partner.search"
  | "partner.export"
  | "partner.ai.query";

type AuditInput = {
  action: PartnerAuditAction;
  actor: Pick<PublicUser, "id" | "role" | "email"> | null;
  metadata?: Record<string, unknown>;
  req?: NextRequest | Request;
};

export async function recordPartnerAudit(input: AuditInput) {
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
        metadata: (input.metadata ?? null) as object,
        ipAddress: ipAddress ?? undefined,
      },
    });
  } catch (error) {
    logger.warn("partner_audit_write_failed", {
      action: input.action,
      actorId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
