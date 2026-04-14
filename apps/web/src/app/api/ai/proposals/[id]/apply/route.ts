import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { aiProposalsRepository } from "@/lib/db/repositories/ai-proposals.repository";

const APPLY_ROLES = ["owner", "supervisor", "super_admin"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requireApiUser(req, APPLY_ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const { id } = await params;
  const payload = await body<{ notes?: string }>(req);
  const proposal = await aiProposalsRepository.getById(tenantId, id);
  if (!proposal) return err("Proposal not found", 404);
  if (proposal.status !== "approved") {
    return err("Only approved proposals can be applied", 409);
  }
  const updated = await aiProposalsRepository.markApplied({
    tenantId,
    id,
    reviewerId: guard.user.id,
    notes: payload.notes,
  });
  return ok({ proposal: updated });
}
