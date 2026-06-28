import { NextRequest } from "next/server";
import { err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { guestFolioRepository } from "@/lib/db/repositories/guest-folio.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { buildEnterpriseFolioPdf } from "@/lib/hotel/folio-pdf";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin", "supervisor"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const format = req.nextUrl.searchParams.get("format") || "pdf";

  const detail = await guestFolioRepository.getDetail(tenantId, id);
  if (!detail) return err("Folio not found", 404);

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });

  if (format === "pdf") {
    const pdf = await buildEnterpriseFolioPdf({
      tenantName: tenant?.name ?? "Hotel",
      folio: detail.folio,
      charges: detail.charges,
      folioId: id,
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="folio-${id}.pdf"`,
      },
    });
  }

  if (format === "xlsx" || format === "excel") {
    const header = "Data\tReparto\tDescrizione\tImporto\tIVA\tSplit\tStato\n";
    const rows = detail.charges
      .map(
        (c) =>
          `${c.postedAt.slice(0, 16)}\t${c.department ?? c.source}\t${c.description.replace(/\t/g, " ")}\t${c.amount}\t${c.vatPct ?? 10}\t${c.splitCode ?? "A"}\t${c.lineStatus ?? "posted"}`,
      )
      .join("\n");
    const bom = "\uFEFF";
    return new Response(bom + header + rows, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="folio-${id}.xls"`,
      },
    });
  }

  const lines = [
    "folio_id,guest,room,balance,date,source,department,description,amount,split,vat",
    ...detail.charges.map(
      (c) =>
        `${detail.folio.id},"${detail.folio.guestName ?? ""}","${detail.folio.roomCode ?? ""}",${detail.folio.balance},${c.postedAt},${c.source},${c.department ?? ""},"${c.description.replace(/"/g, "'")}",${c.amount},${c.splitCode ?? "A"},${c.vatPct ?? 10}`,
    ),
  ];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="folio-${id}.csv"`,
    },
  });
}
