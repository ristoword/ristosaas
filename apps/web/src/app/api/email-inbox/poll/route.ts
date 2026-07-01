import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { pollTenantInbox } from "@/lib/email/inbox-processor";

const INBOX_ROLES = ["owner", "supervisor", "super_admin", "sala", "reception"] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, INBOX_ROLES);
  if (guard.error) return guard.error;
  const tenantId = getTenantId();
  const result = await pollTenantInbox(tenantId);
  return ok(result);
}
