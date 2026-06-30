import { NextRequest } from "next/server";
import { ok, err, bodyLarge } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { hrCandidatesRepository } from "@/lib/db/repositories/hr-candidates.repository";

const ROLES = ["owner", "supervisor", "super_admin"] as const;
const MAX_BYTES = 4 * 1024 * 1024;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id: candidateId } = await ctx.params;
  const payload = await bodyLarge<{
    fileName: string;
    mimeType: string;
    dataBase64: string;
  }>(req);

  if (!payload.fileName?.trim() || !payload.dataBase64) {
    return err("fileName e dataBase64 richiesti", 400);
  }

  const raw = payload.dataBase64.includes(",")
    ? payload.dataBase64.split(",")[1]!
    : payload.dataBase64;
  const fileSize = Math.ceil((raw.length * 3) / 4);
  if (fileSize > MAX_BYTES) return err("File troppo grande (max 4MB)", 400);

  const attachment = await hrCandidatesRepository.addAttachment(getTenantId(), candidateId, {
    fileName: payload.fileName.trim(),
    mimeType: payload.mimeType || "application/octet-stream",
    fileSize,
    dataBase64: raw,
    uploadedByUserId: guard.user.id,
    uploadedByName: guard.user.name,
  });

  return attachment ? ok({ attachment }, 201) : err("Candidato non trovato", 404);
}
