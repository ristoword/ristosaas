import PDFDocument from "pdfkit";
import type { PurchaseOrderDto } from "@/lib/db/repositories/purchase-orders.repository";

export type PurchaseOrderPdfContext = {
  order: PurchaseOrderDto;
  tenantName: string;
  fromAddress?: string | null;
};

const DATE_FMT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

function fmtDate(iso: string | null | undefined, fallback = "—") {
  if (!iso) return fallback;
  try {
    return new Date(iso).toLocaleDateString("it-IT", DATE_FMT);
  } catch {
    return fallback;
  }
}

function fmtMoney(value: number) {
  return `€ ${value.toFixed(2)}`;
}

/**
 * Genera un PDF leggibile dell'ordine fornitore.
 * Nessuna dipendenza esterna oltre a pdfkit, font di sistema.
 */
export async function renderPurchaseOrderPdf(ctx: PurchaseOrderPdfContext): Promise<Buffer> {
  const { order, tenantName, fromAddress } = ctx;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 48 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Header
      doc
        .fillColor("#111")
        .fontSize(20)
        .text("ORDINE D'ACQUISTO", { continued: false })
        .moveDown(0.1)
        .fontSize(10)
        .fillColor("#555")
        .text(`Documento ${order.code}`)
        .moveDown(0.8);

      // Tenant block
      doc
        .fillColor("#111")
        .fontSize(12)
        .text(tenantName, { continued: false })
        .fontSize(9)
        .fillColor("#666");
      if (fromAddress) doc.text(fromAddress);
      doc.moveDown(0.6);

      // Supplier + meta
      const metaY = doc.y;
      doc
        .fontSize(9)
        .fillColor("#666")
        .text("FORNITORE", 48, metaY)
        .fillColor("#111")
        .fontSize(11)
        .text(order.supplierName, 48, metaY + 12);

      const rightX = 340;
      doc
        .fontSize(9)
        .fillColor("#666")
        .text("STATO", rightX, metaY)
        .fillColor("#111")
        .fontSize(11)
        .text(order.status.toUpperCase(), rightX, metaY + 12);

      doc
        .fontSize(9)
        .fillColor("#666")
        .text("DATA ORDINE", rightX, metaY + 34)
        .fillColor("#111")
        .fontSize(11)
        .text(fmtDate(order.orderedAt), rightX, metaY + 46);

      doc
        .fontSize(9)
        .fillColor("#666")
        .text("CONSEGNA ATTESA", rightX, metaY + 68)
        .fillColor("#111")
        .fontSize(11)
        .text(fmtDate(order.expectedAt), rightX, metaY + 80);

      doc.moveDown(4);

      // Items table
      const tableTop = doc.y + 8;
      const col = {
        desc: 48,
        qty: 340,
        unit: 380,
        price: 420,
        total: 500,
      };

      doc
        .fontSize(9)
        .fillColor("#666")
        .text("Articolo", col.desc, tableTop)
        .text("Qtà", col.qty, tableTop, { width: 40, align: "right" })
        .text("U.", col.unit, tableTop, { width: 30, align: "right" })
        .text("Prezzo", col.price, tableTop, { width: 70, align: "right" })
        .text("Subtotale", col.total, tableTop, { width: 70, align: "right" });

      doc
        .moveTo(48, tableTop + 14)
        .lineTo(570, tableTop + 14)
        .strokeColor("#ddd")
        .stroke();

      let y = tableTop + 22;
      doc.fillColor("#111").fontSize(10);

      for (const item of order.items) {
        const descHeight = doc.heightOfString(item.warehouseItemName, {
          width: col.qty - col.desc - 6,
        });
        if (y + descHeight + 18 > doc.page.height - 60) {
          doc.addPage();
          y = 60;
        }
        doc.text(item.warehouseItemName, col.desc, y, { width: col.qty - col.desc - 6 });
        doc.text(item.qtyOrdered.toFixed(3), col.qty, y, { width: 40, align: "right" });
        doc.text(item.unit, col.unit, y, { width: 30, align: "right" });
        doc.text(fmtMoney(item.unitCost), col.price, y, { width: 70, align: "right" });
        doc.text(fmtMoney(item.lineTotal), col.total, y, { width: 70, align: "right" });
        y += Math.max(18, descHeight + 6);
      }

      doc
        .moveTo(48, y + 4)
        .lineTo(570, y + 4)
        .strokeColor("#ddd")
        .stroke();

      // Totals
      y += 14;
      doc
        .fontSize(11)
        .fillColor("#111")
        .text("Totale ordine", col.price - 60, y, { width: 130, align: "right" })
        .fontSize(12)
        .fillColor("#000")
        .text(fmtMoney(order.total), col.total, y, { width: 70, align: "right" });

      if (order.notes) {
        y += 38;
        doc
          .fontSize(9)
          .fillColor("#666")
          .text("NOTE", 48, y)
          .fillColor("#111")
          .fontSize(10)
          .text(order.notes, 48, y + 12, { width: 520 });
      }

      // Footer
      const footer = `Documento generato da RistoSimply · ${new Date().toLocaleString("it-IT")}`;
      doc
        .fontSize(8)
        .fillColor("#888")
        .text(footer, 48, doc.page.height - 48, { width: 520, align: "center" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
