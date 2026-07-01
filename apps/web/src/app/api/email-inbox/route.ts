import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const INBOX_ROLES = ["owner", "supervisor", "super_admin", "sala", "reception"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, INBOX_ROLES);
  if (guard.error) return guard.error;
  const tenantId = getTenantId();
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 50)));
  const status = req.nextUrl.searchParams.get("status");

  const rows = await prisma.inboundEmailMessage.findMany({
    where: {
      tenantId,
      ...(status ? { status: status as "pending" | "processed" | "ignored" | "failed" } : {}),
    },
    orderBy: { receivedAt: "desc" },
    take: limit,
  });

  return ok(
    rows.map((row) => ({
      id: row.id,
      imapUid: row.imapUid,
      fromEmail: row.fromEmail,
      fromName: row.fromName,
      subject: row.subject,
      bodyPreview: row.bodyText.slice(0, 280),
      receivedAt: row.receivedAt.toISOString(),
      status: row.status,
      parsedType: row.parsedType,
      parsedPayload: row.parsedPayload,
      linkedBookingId: row.linkedBookingId,
      linkedOrderId: row.linkedOrderId,
      errorMessage: row.errorMessage,
      processedAt: row.processedAt?.toISOString() ?? null,
    })),
  );
}
