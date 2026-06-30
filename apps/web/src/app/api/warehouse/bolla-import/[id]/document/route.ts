import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { warehouseBollaImportRepository } from "@/lib/db/repositories/warehouse-bolla-import.repository";
import { BOLLA_IMPORT_ROLES } from "@/lib/warehouse/bolla-import/permissions";

const ROLES = BOLLA_IMPORT_ROLES;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const guard = await requireApiUser(req, [...ROLES]);
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const tenantId = getTenantId();
  const mode = req.nextUrl.searchParams.get("mode") ?? "inline";

  const doc = await warehouseBollaImportRepository.getDocument(tenantId, id);
  if (!doc?.documentBase64) {
    return new Response("Documento non trovato", { status: 404 });
  }

  const mime = doc.documentMime ?? "application/pdf";
  const fileName = doc.documentFileName ?? "bolla.pdf";
  const buffer = Buffer.from(doc.documentBase64, "base64");

  const disposition = mode === "download" ? "attachment" : "inline";
  return new Response(buffer, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `${disposition}; filename="${fileName}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
