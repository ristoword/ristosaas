import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { guestFolioRepository } from "@/lib/db/repositories/guest-folio.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { actorFromRequest, writeFolioAudit } from "@/lib/hotel/folio-service";
import type { FolioAttachmentType } from "@prisma/client";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;
type Ctx = { params: Promise<{ id: string }> };

const MAX_BYTES = 2 * 1024 * 1024;

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const detail = await guestFolioRepository.getDetail(tenantId, id);
  if (!detail) return err("Folio not found", 404);
  return ok({ attachments: detail.attachments, auditLogs: detail.auditLogs });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id: folioId } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{
    type: FolioAttachmentType;
    fileName: string;
    mimeType: string;
    dataBase64: string;
  }>(req);

  if (!payload.fileName || !payload.dataBase64 || !payload.type) {
    return err("type, fileName and dataBase64 required", 400);
  }

  const raw = payload.dataBase64.includes(",") ? payload.dataBase64.split(",")[1]! : payload.dataBase64;
  const fileSize = Math.ceil((raw.length * 3) / 4);
  if (fileSize > MAX_BYTES) return err("File troppo grande (max 2MB)", 400);

  const folio = await prisma.guestFolio.findFirst({ where: { id: folioId, tenantId } });
  if (!folio) return err("Folio not found", 404);

  const actor = actorFromRequest(guard.user, req.headers);
  const attachment = await prisma.$transaction(async (tx) => {
    const row = await tx.folioAttachment.create({
      data: {
        tenantId,
        folioId,
        type: payload.type,
        fileName: payload.fileName,
        mimeType: payload.mimeType || "application/octet-stream",
        fileSize,
        dataBase64: raw,
        uploadedByUserId: actor.userId ?? null,
        uploadedByName: actor.userName ?? null,
      },
    });
    await writeFolioAudit(
      {
        tenantId,
        folioId,
        action: "attachment_uploaded",
        newValue: payload.fileName,
        actor,
      },
      tx,
    );
    return row;
  });

  return ok({
    attachment: {
      id: attachment.id,
      folioId: attachment.folioId,
      type: attachment.type,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      createdAt: attachment.createdAt.toISOString(),
    },
  });
}
