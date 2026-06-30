import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { hrCandidatesRepository } from "@/lib/db/repositories/hr-candidates.repository";

const ROLES = ["owner", "supervisor", "super_admin"] as const;
type Ctx = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id, attachmentId } = await ctx.params;
  const attachment = await hrCandidatesRepository.getAttachment(
    getTenantId(),
    id,
    attachmentId,
  );
  if (!attachment) return err("Allegato non trovato", 404);
  return ok({
    ...attachment,
    dataUrl: `data:${attachment.mimeType};base64,${attachment.dataBase64}`,
  });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id, attachmentId } = await ctx.params;
  const deleted = await hrCandidatesRepository.deleteAttachment(
    getTenantId(),
    id,
    attachmentId,
  );
  return deleted ? ok({ deleted: true }) : err("Allegato non trovato", 404);
}
