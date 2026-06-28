import { createHash } from "node:crypto";
import type { FolioCharge, GuestFolio } from "@/modules/integration/domain/types";

type PdfInput = {
  tenantName: string;
  tenantVat?: string | null;
  hotelAddress?: string | null;
  folio: GuestFolio;
  charges: FolioCharge[];
  folioId: string;
};

export async function buildEnterpriseFolioPdf(input: PdfInput): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.on("data", (c: Buffer) => chunks.push(c));

  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const { folio, charges } = input;
  const verifyHash = createHash("sha256")
    .update(`${folio.id}:${folio.balance}:${charges.length}`)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();

  doc.fontSize(18).text(input.tenantName, { align: "left" });
  doc.fontSize(9).fillColor("#555");
  if (input.tenantVat) doc.text(`P.IVA: ${input.tenantVat}`);
  if (input.hotelAddress) doc.text(input.hotelAddress);
  doc.moveDown();
  doc.fillColor("#000");

  doc.fontSize(14).text("GUEST FOLIO", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  doc.text(`Folio ID: ${folio.id}`);
  doc.text(`Ospite: ${folio.guestName ?? "—"}`);
  doc.text(`Camera: ${folio.roomCode ?? "—"}`);
  doc.text(`Stato: ${folio.status}${folio.locked ? " (bloccato)" : ""}`);
  doc.text(`Saldo: ${folio.currency} ${folio.balance.toFixed(2)}`);
  doc.text(`Generato: ${new Date().toLocaleString("it-IT")}`);
  doc.text(`Codice verifica: ${verifyHash}`);

  doc.moveDown();
  doc.fontSize(11).text("Dettaglio movimenti", { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(9);

  for (const c of charges) {
    if (doc.y > doc.page.height - 80) doc.addPage();
    doc.text(
      `${c.postedAt.slice(0, 16)} | ${(c.department ?? c.source).padEnd(12)} | ${c.description.slice(0, 36)} | ${c.amount.toFixed(2)}`,
    );
  }

  doc.moveDown();
  doc.fontSize(10).text(`Totale saldo: ${folio.currency} ${folio.balance.toFixed(2)}`, { align: "right" });
  doc.moveDown(2);
  doc.fontSize(8).fillColor("#666").text("Documento generato elettronicamente — RistoSimply Hotel PMS", { align: "center" });
  doc.text(`Verifica documento: ${verifyHash}`, { align: "center" });

  doc.end();
  return done;
}
