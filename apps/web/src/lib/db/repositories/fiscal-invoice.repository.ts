import { prisma } from "@/lib/db/prisma";
import { buildFatturaPaXml, transmitToSdi, type FatturaPaInput } from "@/lib/integrations/fatturapa";
import { complianceRepository } from "@/lib/db/repositories/compliance.repository";

export const fiscalInvoiceRepository = {
  async nextProgressive(tenantId: string, kind: string) {
    const last = await prisma.fiscalInvoice.findFirst({
      where: { tenantId, kind },
      orderBy: { progressiveNumber: "desc" },
    });
    return (last?.progressiveNumber ?? 0) + 1;
  },

  async createAndTransmit(
    tenantId: string,
    input: {
      kind: string;
      counterparty: string;
      counterpartyVat?: string;
      lines: FatturaPaInput["lines"];
      orderId?: string;
      notes?: string;
    },
  ) {
    const config = await complianceRepository.get(tenantId);
    if (!config.fiscalEnabled || !config.fiscalVatNumber.trim()) {
      throw new Error("Fatturazione elettronica non configurata — completa Area Owner → Integrazioni compliance");
    }

    const progressiveNumber = await this.nextProgressive(tenantId, input.kind);
    const issueDate = new Date().toISOString().slice(0, 10);
    const imponibile = input.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const iva = input.lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.vatRate / 100), 0);
    const total = imponibile + iva;

    const xml = buildFatturaPaXml({
      progressiveNumber,
      issueDate,
      supplierVat: config.fiscalVatNumber.replace(/^IT/i, ""),
      supplierName: config.fiscalBusinessName || "Ristorante",
      supplierPec: config.fiscalPec,
      customerName: input.counterparty,
      customerVat: input.counterpartyVat ?? "",
      sdiRecipientCode: config.fiscalSdiRecipientCode,
      regimeFiscale: config.fiscalRegimeFiscale,
      lines: input.lines,
    });

    const invoice = await prisma.fiscalInvoice.create({
      data: {
        tenantId,
        kind: input.kind,
        progressiveNumber,
        counterparty: input.counterparty,
        counterpartyVat: input.counterpartyVat ?? "",
        amount: imponibile,
        vatAmount: iva,
        total,
        xmlContent: xml,
        sdiStatus: "xml_generated",
        orderId: input.orderId,
        notes: input.notes ?? "",
      },
    });

    try {
      const sdi = await transmitToSdi(xml, config.fiscalPec);
      return await prisma.fiscalInvoice.update({
        where: { id: invoice.id },
        data: {
          sdiStatus: "sdi_sent",
          sdiMessageId: sdi.messageId,
          sdiResponse: sdi.response,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return await prisma.fiscalInvoice.update({
        where: { id: invoice.id },
        data: { sdiStatus: "sdi_rejected", sdiResponse: message },
      });
    }
  },

  async list(tenantId: string, kind?: string) {
    return prisma.fiscalInvoice.findMany({
      where: { tenantId, ...(kind ? { kind } : {}) },
      orderBy: { issueDate: "desc" },
      take: 100,
    });
  },
};
