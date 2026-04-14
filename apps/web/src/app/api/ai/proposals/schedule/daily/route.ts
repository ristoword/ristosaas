import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { aiKitchenRepository } from "@/lib/db/repositories/ai-kitchen.repository";
import { aiProposalsRepository } from "@/lib/db/repositories/ai-proposals.repository";
import { prisma } from "@/lib/db/prisma";
import { sendOperationalAlert } from "@/lib/observability/alerts";

export async function POST(req: NextRequest) {
  const expectedToken = process.env.AI_SCHEDULER_TOKEN;
  if (!expectedToken) return err("AI_SCHEDULER_TOKEN non configurato", 500);
  const providedToken = req.headers.get("x-scheduler-token") || "";
  if (providedToken !== expectedToken) return err("Forbidden", 403);

  const tenants = await prisma.tenant.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  let generated = 0;
  for (const tenant of tenants) {
    const snapshot = await aiKitchenRepository.operationalSnapshot(tenant.id, 14);
    const drafts = aiKitchenRepository.buildProposalDrafts(snapshot);
    await aiProposalsRepository.createBatch({
      tenantId: tenant.id,
      createdBy: "scheduler",
      drafts,
      status: "pending_review",
    });
    generated += drafts.length;
  }

  await sendOperationalAlert({
    key: "ai-proposals-scheduled-run",
    title: "Run giornaliero AI operativo completato",
    message: `Generate ${generated} proposte su ${tenants.length} tenant.`,
    severity: "warning",
    metadata: { generated, tenants: tenants.length },
  });

  return ok({ tenants: tenants.length, generated });
}
