import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import type { KitchenProposalDraft } from "@/lib/db/repositories/ai-kitchen.repository";

type ProposalStatus = "draft" | "pending_review" | "approved" | "rejected" | "applied" | "cancelled";
type ProposalType =
  | "food_cost"
  | "warehouse"
  | "menu"
  | "pricing"
  | "manager_report"
  | "reorder"
  | "hotel_bridge";

export type AiProposalDto = {
  id: string;
  tenantId: string;
  createdBy: string;
  type: ProposalType;
  status: ProposalStatus;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapProposal(row: {
  id: string;
  tenantId: string;
  createdBy: string;
  type: ProposalType;
  status: ProposalStatus;
  title: string;
  summary: string;
  payload: unknown;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  appliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AiProposalDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    createdBy: row.createdBy,
    type: row.type,
    status: row.status,
    title: row.title,
    summary: row.summary,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewNotes: row.reviewNotes,
    appliedAt: row.appliedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const aiProposalsRepository = {
  async list(
    tenantId: string,
    filters?: { status?: ProposalStatus | null; type?: ProposalType | null; limit?: number; onlyOpen?: boolean },
  ) {
    const rows = await prisma.aiProposal.findMany({
      where: {
        tenantId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.onlyOpen ? { status: { in: ["draft", "pending_review", "approved"] } } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
      take: Math.min(100, Math.max(1, filters?.limit ?? 30)),
    });
    return rows.map(mapProposal);
  },
  async createBatch(params: {
    tenantId: string;
    createdBy: string;
    drafts: KitchenProposalDraft[];
    status?: ProposalStatus;
  }) {
    const status = params.status ?? "pending_review";
    const created = await prisma.$transaction(
      params.drafts.map((draft) =>
        prisma.aiProposal.create({
          data: {
            tenantId: params.tenantId,
            createdBy: params.createdBy,
            type: draft.type,
            status,
            title: draft.title,
            summary: draft.summary,
            payload: draft.payload as Prisma.InputJsonValue,
          },
        }),
      ),
    );
    return created.map(mapProposal);
  },
  async review(params: {
    tenantId: string;
    id: string;
    reviewerId: string;
    action: "approve" | "reject" | "cancel";
    notes?: string;
  }) {
    const existing = await prisma.aiProposal.findFirst({
      where: { tenantId: params.tenantId, id: params.id },
    });
    if (!existing) return null;
    const nextStatus: ProposalStatus =
      params.action === "approve"
        ? "approved"
        : params.action === "reject"
          ? "rejected"
          : "cancelled";
    const updated = await prisma.aiProposal.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        reviewedBy: params.reviewerId,
        reviewedAt: new Date(),
        reviewNotes: params.notes?.trim() || null,
      },
    });
    return mapProposal(updated);
  },
  async markApplied(params: { tenantId: string; id: string; reviewerId: string; notes?: string }) {
    const existing = await prisma.aiProposal.findFirst({
      where: { tenantId: params.tenantId, id: params.id },
    });
    if (!existing) return null;
    const updated = await prisma.aiProposal.update({
      where: { id: existing.id },
      data: {
        status: "applied",
        appliedAt: new Date(),
        reviewedBy: params.reviewerId,
        reviewedAt: new Date(),
        reviewNotes: params.notes?.trim() || existing.reviewNotes || null,
      },
    });
    return mapProposal(updated);
  },
  async getById(tenantId: string, id: string) {
    const row = await prisma.aiProposal.findFirst({
      where: { tenantId, id },
    });
    return row ? mapProposal(row) : null;
  },
};
