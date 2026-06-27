import { decisionsToProposalDrafts } from "@/lib/ai/decisions/proposal-mapper";
import type { AiDecisionEnvelope } from "@/lib/ai/decisions/types";
import { aiProposalsRepository } from "@/lib/db/repositories/ai-proposals.repository";
import type { AutomationLevel, AutomationRunRecord } from "@/lib/ai/automation/types";
import { automationAudit } from "@/lib/ai/automation/audit";

export type ApprovalResult = {
  required: boolean;
  proposalId: string | null;
  status: "suggestion" | "pending_review" | "auto_approved";
};

export const automationApproval = {
  requiresApproval(level: AutomationLevel): boolean {
    return level === 2;
  },

  isAutoExecute(level: AutomationLevel): boolean {
    return level === 3;
  },

  isSuggestionOnly(level: AutomationLevel): boolean {
    return level === 1;
  },

  async createProposalFromDecision(params: {
    tenantId: string;
    createdBy: string;
    decision: AiDecisionEnvelope;
    level: AutomationLevel;
    runId: string;
  }): Promise<ApprovalResult> {
    if (params.level === 1) {
      await automationAudit.logEvent({
        runId: params.runId,
        tenantId: params.tenantId,
        event: "suggestion_only",
        payload: { domain: params.decision.domain },
        userId: params.createdBy,
      });
      return { required: false, proposalId: null, status: "suggestion" };
    }

    const [draft] = decisionsToProposalDrafts([params.decision]);
    const status = params.level === 3 ? "approved" : "pending_review";
    const [proposal] = await aiProposalsRepository.createBatch({
      tenantId: params.tenantId,
      createdBy: params.createdBy,
      drafts: [draft],
      status,
    });

    await automationAudit.updateRun(params.runId, {
      proposalId: proposal.id,
      status: params.level === 3 ? "running" : "awaiting_approval",
    });

    await automationAudit.logEvent({
      runId: params.runId,
      tenantId: params.tenantId,
      event: params.level === 3 ? "auto_approved" : "proposal_created",
      payload: { proposalId: proposal.id, level: params.level },
      userId: params.createdBy,
    });

    return {
      required: params.level === 2,
      proposalId: proposal.id,
      status: params.level === 3 ? "auto_approved" : "pending_review",
    };
  },

  async approveRun(params: {
    tenantId: string;
    run: AutomationRunRecord;
    reviewerId: string;
    notes?: string;
  }): Promise<AutomationRunRecord | null> {
    if (!params.run.proposalId) return null;

    const proposal = await aiProposalsRepository.review({
      tenantId: params.tenantId,
      id: params.run.proposalId,
      reviewerId: params.reviewerId,
      action: "approve",
      notes: params.notes,
    });
    if (!proposal) return null;

    const updated = await automationAudit.updateRun(params.run.id, {
      status: "running",
      approvedBy: params.reviewerId,
      approvedAt: new Date(),
    });

    await automationAudit.logEvent({
      runId: params.run.id,
      tenantId: params.tenantId,
      event: "approved",
      payload: { proposalId: params.run.proposalId, notes: params.notes ?? null },
      userId: params.reviewerId,
    });

    return updated;
  },

  async rejectRun(params: {
    tenantId: string;
    run: AutomationRunRecord;
    reviewerId: string;
    notes?: string;
  }): Promise<AutomationRunRecord | null> {
    if (params.run.proposalId) {
      await aiProposalsRepository.review({
        tenantId: params.tenantId,
        id: params.run.proposalId,
        reviewerId: params.reviewerId,
        action: "reject",
        notes: params.notes,
      });
    }

    const updated = await automationAudit.updateRun(params.run.id, {
      status: "failed",
      errorMessage: params.notes ?? "Rifiutato dal supervisor",
      finishedAt: new Date(),
    });

    await automationAudit.logEvent({
      runId: params.run.id,
      tenantId: params.tenantId,
      event: "rejected",
      payload: { notes: params.notes ?? null },
      userId: params.reviewerId,
    });

    return updated;
  },
};
