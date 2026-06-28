import { NextRequest } from "next/server";
import { err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { actorFromRequest, guestRegisterRepository } from "@/lib/hotel/guest-register-service";
import { getTenantId } from "@/lib/db/repositories/tenant-context";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin", "supervisor"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();

  const file = await guestRegisterRepository.getAttachmentDecrypted(
    tenantId,
    id,
    actorFromRequest(guard.user, req.headers),
  );
  if (!file) return err("Allegato non trovato", 404);

  const buffer = Buffer.from(file.dataBase64, "base64");
  return new Response(buffer, {
    headers: {
      "Content-Type": file.meta.mimeType,
      "Content-Disposition": `inline; filename="${file.meta.fileName}"`,
    },
  });
}
