import { NextRequest } from "next/server";
import { err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { guestFolioRepository } from "@/lib/db/repositories/guest-folio.repository";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const format = req.nextUrl.searchParams.get("format") || "pdf";

  const detail = await guestFolioRepository.getDetail(tenantId, id);
  if (!detail) return err("Folio not found", 404);

  if (format === "pdf") {
    const PDFDocument = (await import("pdfkit")).default;
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 40 });
    doc.on("data", (c: Buffer) => chunks.push(c));

    const done = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(16).text("Guest Folio", { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`Folio: ${detail.folio.id}`);
    doc.text(`Ospite: ${detail.folio.guestName ?? "—"}`);
    doc.text(`Camera: ${detail.folio.roomCode ?? "—"}`);
    doc.text(`Saldo: ${detail.folio.currency} ${detail.folio.balance.toFixed(2)}`);
    doc.text(`Stato: ${detail.folio.status}`);
    doc.moveDown();
    doc.text("Movimenti:");
    for (const c of detail.charges) {
      doc.text(
        `${c.postedAt.slice(0, 16)} | ${c.source} | ${c.description} | ${c.amount.toFixed(2)}`,
      );
    }

    doc.end();
    const pdf = await done;
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="folio-${id}.pdf"`,
      },
    });
  }

  const lines = [
    "folio_id,guest,room,balance,date,source,description,amount",
    ...detail.charges.map(
      (c) =>
        `${detail.folio.id},"${detail.folio.guestName ?? ""}","${detail.folio.roomCode ?? ""}",${detail.folio.balance},${c.postedAt},${c.source},"${c.description.replace(/"/g, "'")}",${c.amount}`,
    ),
  ];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="folio-${id}.csv"`,
    },
  });
}
