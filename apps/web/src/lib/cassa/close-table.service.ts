import { complianceRepository } from "@/lib/db/repositories/compliance.repository";
import { fiscalInvoiceRepository } from "@/lib/db/repositories/fiscal-invoice.repository";
import { ordersRepository } from "@/lib/db/repositories/orders.repository";
import { dispatchPrintJobAsync } from "@/lib/integrations/print-dispatcher";

export type CloseTableInput = {
  orderIds: string[];
  paymentMethod?: string;
  counterparty?: string;
  discount?: number;
  vatRate?: number;
};

export async function closeTableOrders(tenantId: string, input: CloseTableInput) {
  if (!input.orderIds.length) throw new Error("Nessun ordine da chiudere");

  const orders = await Promise.all(
    input.orderIds.map((id) => ordersRepository.get(tenantId, id)),
  );
  const valid = orders.filter((o): o is NonNullable<typeof o> => o != null);
  if (!valid.length) throw new Error("Ordini non trovati");

  const subtotal = valid.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + (i.price ?? 0) * i.qty, 0),
    0,
  );
  const discount = input.discount ?? 0;
  const vatRate = input.vatRate ?? 10;
  const afterDiscount = Math.max(0, subtotal - discount);
  const total = afterDiscount * (1 + vatRate / 100);
  const tableLabel = valid[0]?.table ?? "—";

  const closedIds: string[] = [];
  for (const order of valid) {
    const updated = await ordersRepository.update(tenantId, order.id, { status: "chiuso" });
    if (updated) closedIds.push(order.id);
  }

  const config = await complianceRepository.get(tenantId);
  let fiscalInvoice: Awaited<ReturnType<typeof fiscalInvoiceRepository.createAndTransmit>> | null = null;

  if (config.fiscalEnabled && total > 0) {
    const lines = valid.flatMap((o) =>
      o.items.map((i) => ({
        description: `${i.name}${o.table ? ` (tav. ${o.table})` : ""}`,
        quantity: i.qty,
        unitPrice: i.price ?? 0,
        vatRate,
      })),
    );
    if (discount > 0) {
      lines.push({
        description: "Sconto",
        quantity: 1,
        unitPrice: -discount,
        vatRate: 0,
      });
    }
    fiscalInvoice = await fiscalInvoiceRepository.createAndTransmit(tenantId, {
      kind: "cassa",
      counterparty: input.counterparty?.trim() || `Tavolo ${tableLabel}`,
      lines,
      orderId: valid[0]?.id,
      notes: input.paymentMethod ? `Pagamento: ${input.paymentMethod}` : "",
    });
  }

  if (config.autoPrintBillClose) {
    const lines = [
      `CHIUSURA CONTO — Tavolo ${tableLabel}`,
      `Ordini: ${valid.length}`,
      `Subtotale: €${subtotal.toFixed(2)}`,
      ...(discount > 0 ? [`Sconto: -€${discount.toFixed(2)}`] : []),
      `IVA ${vatRate}%`,
      `TOTALE: €${total.toFixed(2)}`,
      input.paymentMethod ? `Pagamento: ${input.paymentMethod}` : "",
      fiscalInvoice ? `Fattura SDI: #${fiscalInvoice.progressiveNumber}` : "",
    ].filter(Boolean);
    dispatchPrintJobAsync(tenantId, "chiusura_conto", "cassa", lines);
  }

  return {
    closedOrderIds: closedIds,
    table: tableLabel,
    subtotal,
    discount,
    vatRate,
    total,
    fiscalInvoice,
  };
}
