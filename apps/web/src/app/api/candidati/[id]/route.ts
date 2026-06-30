import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { hrCandidatesRepository } from "@/lib/db/repositories/hr-candidates.repository";
import type { HrCandidateSource, HrCandidateStatus } from "@/lib/api-client";

const ROLES = ["owner", "supervisor", "super_admin"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const item = await hrCandidatesRepository.get(getTenantId(), id);
  return item ? ok(item) : err("Candidato non trovato", 404);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const data = await body<Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    age: number | null;
    experienceYears: number | null;
    roles: string[];
    status: HrCandidateStatus;
    source: HrCandidateSource;
    sourceEmailFrom: string;
    sourceEmailSubject: string;
    sourceEmailBody: string;
    presentedAt: string;
    notes: string;
  }>>(req);
  const updated = await hrCandidatesRepository.update(getTenantId(), id, data);
  return updated ? ok(updated) : err("Candidato non trovato", 404);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const deleted = await hrCandidatesRepository.delete(getTenantId(), id);
  return deleted ? ok({ deleted: true }) : err("Candidato non trovato", 404);
}
