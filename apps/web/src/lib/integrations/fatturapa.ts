import { randomUUID } from "node:crypto";

export type FatturaPaInput = {
  progressiveNumber: number;
  issueDate: string;
  supplierVat: string;
  supplierName: string;
  supplierPec: string;
  customerName: string;
  customerVat: string;
  sdiRecipientCode: string;
  regimeFiscale: string;
  lines: Array<{ description: string; quantity: number; unitPrice: number; vatRate: number }>;
};

function money(n: number) {
  return n.toFixed(2);
}

export function buildFatturaPaXml(input: FatturaPaInput): string {
  const id = randomUUID();
  const imponibile = input.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const iva = input.lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.vatRate / 100), 0);
  const totale = imponibile + iva;
  const lineXml = input.lines
    .map(
      (l, i) => `
      <DettaglioLinee>
        <NumeroLinea>${i + 1}</NumeroLinea>
        <Descrizione>${escapeXml(l.description)}</Descrizione>
        <Quantita>${money(l.quantity)}</Quantita>
        <PrezzoUnitario>${money(l.unitPrice)}</PrezzoUnitario>
        <PrezzoTotale>${money(l.quantity * l.unitPrice)}</PrezzoTotale>
        <AliquotaIVA>${money(l.vatRate)}</AliquotaIVA>
      </DettaglioLinee>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>${escapeXml(input.supplierVat)}</IdCodice></IdTrasmittente>
      <ProgressivoInvio>${input.progressiveNumber}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${escapeXml(input.sdiRecipientCode)}</CodiceDestinatario>
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>${escapeXml(input.supplierVat)}</IdCodice></IdFiscaleIVA>
        <Anagrafica><Denominazione>${escapeXml(input.supplierName)}</Denominazione></Anagrafica>
        <RegimeFiscale>${escapeXml(input.regimeFiscale)}</RegimeFiscale>
      </DatiAnagrafici>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <Anagrafica><Denominazione>${escapeXml(input.customerName || "Cliente")}</Denominazione></Anagrafica>
      </DatiAnagrafici>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${input.issueDate}</Data>
        <Numero>${input.progressiveNumber}</Numero>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>${lineXml}
      <DatiRiepilogo>
        <AliquotaIVA>${money(input.lines[0]?.vatRate ?? 10)}</AliquotaIVA>
        <ImponibileImporto>${money(imponibile)}</ImponibileImporto>
        <Imposta>${money(iva)}</Imposta>
      </DatiRiepilogo>
    </DatiBeniServizi>
    <DatiPagamento>
      <DettaglioPagamento>
        <ModalitaPagamento>MP01</ModalitaPagamento>
        <ImportoPagamento>${money(totale)}</ImportoPagamento>
      </DettaglioPagamento>
    </DatiPagamento>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;
}

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function transmitToSdi(xml: string, pec: string): Promise<{ messageId: string; response: string }> {
  const endpoint =
    process.env.SDI_ENDPOINT_URL ??
    "https://ivaservizi.agenziaentrate.gov.it/services/InvioFatture";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/xml",
      "X-SDI-PEC": pec,
    },
    body: xml,
    signal: AbortSignal.timeout(60_000),
  });
  const response = await res.text();
  if (!res.ok) {
    throw new Error(`SDI rifiuto HTTP ${res.status}: ${response.slice(0, 500)}`);
  }
  const messageId = response.match(/<IdentificativoSdI>(\d+)<\/IdentificativoSdI>/i)?.[1] ?? `SDI-${Date.now()}`;
  return { messageId, response: response.slice(0, 4000) };
}
