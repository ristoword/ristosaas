import { NextRequest } from "next/server";
import { ok, err, body, withErrorHandler } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { hrCandidatesRepository } from "@/lib/db/repositories/hr-candidates.repository";
import type { HrCandidateSource, HrCandidateStatus } from "@/lib/api-client";

const ROLES = ["owner", "supervisor", "super_admin"] as const;

export const GET = withErrorHandler(async (req: NextRequest) => {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  return ok(await hrCandidatesRepository.all(getTenantId()));
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const data = await body<{
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    age?: number | null;
    experienceYears?: number | null;
    roles?: string[];
    status?: HrCandidateStatus;
    source?: HrCandidateSource;
    sourceEmailFrom?: string;
    sourceEmailSubject?: string;
    sourceEmailBody?: string;
    presentedAt?: string;
    notes?: string;
  }>(req);
  if (!data.firstName?.trim() && !data.lastName?.trim()) {
    return err("Nome o cognome richiesto");
  }
  const item = await hrCandidatesRepository.create(getTenantId(), {
    ...data,
    firstName: data.firstName?.trim() || "—",
    lastName: data.lastName?.trim() || "",
  });
  return ok(item, 201);
});
