import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { aiProposalsRepository } from "@/lib/db/repositories/ai-proposals.repository";

const REVIEW_ROLES = ["owner", "supervisor", "super_admin"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requireApiUser(req, REVIEW_ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const { id } = await params;
  const payload = await body<{ action?: "approve" | "reject" | "cancel"; notes?: string }>(req);
  const action = payload.action;
  if (!action || !["approve", "reject", "cancel"].includes(action)) {
    return err("action must be one of: approve, reject, cancel", 400);
  }
  const proposal = await aiProposalsRepository.review({
    tenantId,
    id,
    reviewerId: guard.user.id,
    action,
    notes: payload.notes,
  });
  if (!proposal) return err("Proposal not found", 404);
  return ok({ proposal });
}
