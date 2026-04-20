import { prisma } from "@/lib/db/prisma";

type DecimalLike = { toNumber: () => number };

export type PurchaseOrderStatus = "bozza" | "inviato" | "parziale" | "ricevuto" | "annullato";

export type PurchaseOrderItemDto = {
  id: string;
  warehouseItemId: string;
  warehouseItemName: string;
  qtyOrdered: number;
  qtyReceived: number;
  unit: string;
  unitCost: number;
  notes: string;
  lineTotal: number;
  outstandingQty: number;
};

export type PurchaseOrderDto = {
  id: string;
  tenantId: string;
  supplierId: string;
  supplierName: string;
  code: string;
  status: PurchaseOrderStatus;
  notes: string;
  orderedAt: string;
  expectedAt: string | null;
  receivedAt: string | null;
  total: number;
  items: PurchaseOrderItemDto[];
};

type Row = {
  id: string;
  tenantId: string;
  supplierId: string;
  code: string;
  status: PurchaseOrderStatus;
  notes: string;
  orderedAt: Date;
  expectedAt: Date | null;
  receivedAt: Date | null;
  total: DecimalLike;
  supplier: { name: string };
  items: Array<{
    id: string;
    warehouseItemId: string;
    qtyOrdered: DecimalLike;
    qtyReceived: DecimalLike;
    unit: string;
    unitCost: DecimalLike;
    notes: string;
    warehouseItem: { name: string };
  }>;
};

function mapItem(
  row: Row["items"][number],
): PurchaseOrderItemDto {
  const qtyOrdered = row.qtyOrdered.toNumber();
  const qtyReceived = row.qtyReceived.toNumber();
  const unitCost = row.unitCost.toNumber();
  return {
    id: row.id,
    warehouseItemId: row.warehouseItemId,
    warehouseItemName: row.warehouseItem.name,
    qtyOrdered,
    qtyReceived,
    unit: row.unit,
    unitCost,
    notes: row.notes,
    lineTotal: +(qtyOrdered * unitCost).toFixed(2),
    outstandingQty: Math.max(0, qtyOrdered - qtyReceived),
  };
}

function mapOrder(row: Row): PurchaseOrderDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    supplierId: row.supplierId,
    supplierName: row.supplier.name,
    code: row.code,
    status: row.status,
    notes: row.notes,
    orderedAt: row.orderedAt.toISOString(),
    expectedAt: row.expectedAt ? row.expectedAt.toISOString() : null,
    receivedAt: row.receivedAt ? row.receivedAt.toISOString() : null,
    total: row.total.toNumber(),
    items: row.items.map(mapItem),
  };
}

function generateCode(slugHint: string) {
  const d = new Date();
  const yyyyMMdd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const prefix = (slugHint || "PO").replace(/[^A-Z0-9]/gi, "").slice(0, 4).toUpperCase() || "PO";
  return `${prefix}-${yyyyMMdd}-${rand}`;
}

function recalcTotal(items: Array<{ qtyOrdered: number; unitCost: number }>) {
  const total = items.reduce((sum, it) => sum + it.qtyOrdered * it.unitCost, 0);
  return +total.toFixed(2);
}

function deriveStatus(items: Array<{ qtyOrdered: number; qtyReceived: number }>, current: PurchaseOrderStatus): PurchaseOrderStatus {
  if (current === "annullato") return "annullato";
  if (items.length === 0) return current === "bozza" ? "bozza" : current;
  const allReceived = items.every((i) => i.qtyReceived >= i.qtyOrdered - 1e-6);
  const noneReceived = items.every((i) => i.qtyReceived <= 1e-6);
  if (allReceived) return "ricevuto";
  if (!noneReceived) return "parziale";
  // Se ha un codice ed è stato salvato, "inviato" o "bozza" a seconda di current.
  return current === "bozza" ? "bozza" : "inviato";
}

export const purchaseOrdersRepository = {
  /** Lista ordini per tenant (opzionalmente filtrata per supplier). */
  async list(tenantId: string, opts?: { supplierId?: string | null; status?: PurchaseOrderStatus }) {
    const rows = await prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        supplierId: opts?.supplierId ?? undefined,
        status: opts?.status ?? undefined,
      },
      orderBy: { orderedAt: "desc" },
      include: {
        supplier: { select: { name: true } },
        items: {
          include: { warehouseItem: { select: { name: true } } },
        },
      },
    });
    return rows.map(mapOrder);
  },

  async get(tenantId: string, id: string) {
    const row = await prisma.purchaseOrder.findFirst({
      where: { tenantId, id },
      include: {
        supplier: { select: { name: true } },
        items: { include: { warehouseItem: { select: { name: true } } } },
      },
    });
    return row ? mapOrder(row) : null;
  },

  /**
   * Crea un nuovo ordine con righe. Se `status` non è specificato parte in `bozza`.
   * Valida che tutti i warehouseItem appartengano allo stesso tenant.
   */
  async create(
    tenantId: string,
    payload: {
      supplierId: string;
      status?: PurchaseOrderStatus;
      notes?: string;
      expectedAt?: string | null;
      items: Array<{
        warehouseItemId: string;
        qtyOrdered: number;
        unit: string;
        unitCost: number;
        notes?: string;
      }>;
    },
  ) {
    if (!payload.items || payload.items.length === 0) {
      throw new Error("Nessuna riga: aggiungi almeno un articolo all'ordine.");
    }

    const supplier = await prisma.supplier.findFirst({
      where: { id: payload.supplierId, tenantId },
      select: { id: true, name: true },
    });
    if (!supplier) throw new Error("Fornitore non trovato.");

    const itemIds = payload.items.map((it) => it.warehouseItemId);
    const items = await prisma.warehouseItem.findMany({
      where: { tenantId, id: { in: itemIds } },
      select: { id: true, name: true },
    });
    if (items.length !== itemIds.length) {
      throw new Error("Uno o più articoli non appartengono al magazzino del tenant.");
    }

    const code = generateCode(supplier.name);
    const total = recalcTotal(
      payload.items.map((it) => ({ qtyOrdered: it.qtyOrdered, unitCost: it.unitCost })),
    );

    const created = await prisma.purchaseOrder.create({
      data: {
        tenantId,
        supplierId: supplier.id,
        code,
        status: payload.status ?? "bozza",
        notes: payload.notes ?? "",
        expectedAt: payload.expectedAt ? new Date(payload.expectedAt) : null,
        total,
        items: {
          create: payload.items.map((it) => ({
            tenantId,
            warehouseItemId: it.warehouseItemId,
            qtyOrdered: it.qtyOrdered,
            qtyReceived: 0,
            unit: it.unit,
            unitCost: it.unitCost,
            notes: it.notes ?? "",
          })),
        },
      },
      include: {
        supplier: { select: { name: true } },
        items: { include: { warehouseItem: { select: { name: true } } } },
      },
    });

    return mapOrder(created);
  },

  /** Aggiorna lo stato del documento (es. bozza -> inviato, inviato -> annullato). */
  async setStatus(tenantId: string, id: string, status: PurchaseOrderStatus) {
    const existing = await prisma.purchaseOrder.findFirst({
      where: { tenantId, id },
      include: { items: true },
    });
    if (!existing) return null;
    if (existing.status === "ricevuto" || existing.status === "annullato") {
      throw new Error("Ordine gia chiuso: stato non modificabile.");
    }
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status },
      include: {
        supplier: { select: { name: true } },
        items: { include: { warehouseItem: { select: { name: true } } } },
      },
    });
    return mapOrder(updated);
  },

  /**
   * Registra la ricezione di una o piu' righe. Per ogni riga ricevuta:
   * - somma a qtyReceived dell'item dell'ordine.
   * - aggiorna WarehouseItem.qty (+= qtyReceived) e ricalcola costPerUnit via
   *   media ponderata sullo stock.
   * - crea WarehouseMovement tipo "carico" con reason che include il PO code.
   * Alla fine deriva lo stato (parziale / ricevuto) e mette receivedAt se chiuso.
   */
  async receive(
    tenantId: string,
    id: string,
    receipts: Array<{ itemId: string; qty: number }>,
  ) {
    if (receipts.length === 0) throw new Error("Nessuna riga da ricevere.");

    return prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findFirst({
        where: { tenantId, id },
        include: { items: true },
      });
      if (!order) throw new Error("Ordine non trovato.");
      if (order.status === "ricevuto") throw new Error("Ordine gia completamente ricevuto.");
      if (order.status === "annullato") throw new Error("Ordine annullato, non e possibile ricevere merce.");

      const byItemId = new Map(order.items.map((it) => [it.id, it]));

      for (const r of receipts) {
        if (r.qty <= 0) continue;
        const line = byItemId.get(r.itemId);
        if (!line) throw new Error(`Riga ${r.itemId} non appartiene all'ordine.`);

        const already = line.qtyReceived.toNumber();
        const ordered = line.qtyOrdered.toNumber();
        const outstanding = Math.max(0, ordered - already);
        const effective = Math.min(r.qty, outstanding);
        if (effective <= 0) continue;

        const stockItem = await tx.warehouseItem.findUnique({
          where: { id: line.warehouseItemId },
        });
        if (!stockItem || stockItem.tenantId !== tenantId) {
          throw new Error("Articolo magazzino non valido.");
        }

        const prevQty = stockItem.qty.toNumber();
        const prevCost = stockItem.costPerUnit.toNumber();
        const newQty = prevQty + effective;
        const unitCost = line.unitCost.toNumber();
        const weightedCost =
          newQty > 0 ? (prevQty * prevCost + effective * unitCost) / newQty : unitCost;

        // aggiorna magazzino
        await tx.warehouseItem.update({
          where: { id: stockItem.id },
          data: {
            qty: newQty,
            costPerUnit: Number(weightedCost.toFixed(4)),
          },
        });

        // storico movimenti
        await tx.warehouseMovement.create({
          data: {
            tenantId,
            warehouseItemId: stockItem.id,
            date: new Date(),
            type: "carico",
            qty: effective,
            unit: line.unit,
            reason: `Carico da PO ${order.code}`,
            orderId: order.id,
          },
        });

        // storico costo (media ponderata dopo la ricezione)
        await tx.warehouseCostHistory.create({
          data: {
            tenantId,
            warehouseItemId: stockItem.id,
            unitCost: Number(weightedCost.toFixed(4)),
            source: `po_receive:${order.code}`,
            effectiveAt: new Date(),
          },
        });

        // aggiorna riga ordine
        await tx.purchaseOrderItem.update({
          where: { id: line.id },
          data: { qtyReceived: already + effective },
        });

        byItemId.set(line.id, {
          ...line,
          qtyReceived: { toNumber: () => already + effective } as any,
        });
      }

      // ricalcolo stato ordine
      const freshItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: order.id },
      });
      const mapped = freshItems.map((i) => ({
        qtyOrdered: i.qtyOrdered.toNumber(),
        qtyReceived: i.qtyReceived.toNumber(),
      }));
      const nextStatus = deriveStatus(mapped, order.status);
      const isFullyReceived = nextStatus === "ricevuto";

      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          status: nextStatus,
          receivedAt: isFullyReceived ? new Date() : null,
        },
      });

      const updated = await tx.purchaseOrder.findFirst({
        where: { id: order.id },
        include: {
          supplier: { select: { name: true } },
          items: { include: { warehouseItem: { select: { name: true } } } },
        },
      });
      return updated ? mapOrder(updated) : null;
    });
  },

  async cancel(tenantId: string, id: string) {
    const existing = await prisma.purchaseOrder.findFirst({ where: { tenantId, id } });
    if (!existing) return null;
    if (existing.status === "ricevuto") throw new Error("Ordine gia ricevuto, non annullabile.");
    const row = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: "annullato" },
      include: {
        supplier: { select: { name: true } },
        items: { include: { warehouseItem: { select: { name: true } } } },
      },
    });
    return mapOrder(row);
  },
};
