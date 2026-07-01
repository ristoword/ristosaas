import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { processInboundMessageRecord } from "@/lib/email/inbox-processor";

const INBOX_ROLES = ["owner", "supervisor", "super_admin", "sala", "reception"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, INBOX_ROLES);
  if (guard.error) return guard.error;
  const tenantId = getTenantId();
  const { id } = await ctx.params;
  const row = await prisma.inboundEmailMessage.findFirst({ where: { id, tenantId } });
  if (!row) return err("Messaggio non trovato", 404);
  const updated = await processInboundMessageRecord(tenantId, row, { force: true });
  return ok({
    id: updated.id,
    status: updated.status,
    parsedType: updated.parsedType,
    linkedBookingId: updated.linkedBookingId,
    linkedOrderId: updated.linkedOrderId,
    errorMessage: updated.errorMessage,
  });
}
