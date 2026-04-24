import { prisma } from "@/lib/db/prisma";
import type {
  LocationStock,
  StockItem,
  StockItemWithLocations,
  StockMovement,
  WarehouseEquipment,
  WarehouseLocation,
} from "@/lib/api/types/warehouse";

type MovementType = StockMovement["type"];

const CENTRAL: WarehouseLocation = "MAGAZZINO_CENTRALE";

function mapItem(row: {
  id: string;
  name: string;
  category: string;
  qty: { toNumber: () => number };
  unit: string;
  minStock: { toNumber: () => number };
  costPerUnit: { toNumber: () => number };
  supplier: string;
}): StockItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    qty: row.qty.toNumber(),
    unit: row.unit,
    minStock: row.minStock.toNumber(),
    costPerUnit: row.costPerUnit.toNumber(),
    supplier: row.supplier,
  };
}

function mapMovement(row: {
  id: string;
  date: Date;
  warehouseItemId: string;
  item: { name: string };
  type: MovementType;
  qty: { toNumber: () => number };
  unit: string;
  reason: string;
  fromLocation: string | null;
  toLocation: string | null;
  note: string | null;
  orderId: string | null;
}): StockMovement {
  return {
    id: row.id,
    date: row.date.toISOString().slice(0, 10),
    productId: row.warehouseItemId,
    productName: row.item.name,
    type: row.type,
    qty: row.qty.toNumber(),
    unit: row.unit,
    reason: row.reason,
    fromLocation: row.fromLocation,
    toLocation: row.toLocation,
    note: row.note,
    orderId: row.orderId || undefined,
  };
}

function mapEquipment(row: {
  id: string;
  name: string;
  category: string;
  qty: number;
  status: string;
  location: string;
  value: { toNumber: () => number };
}): WarehouseEquipment {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    qty: row.qty,
    status: row.status as WarehouseEquipment["status"],
    location: row.location,
    value: row.value.toNumber(),
  };
}

/**
 * Legge lo stock di un singolo reparto (non centrale) per un prodotto.
 * Ritorna 0 se non esiste ancora una riga per quel reparto.
 */
async function getLocationQty(
  tenantId: string,
  warehouseItemId: string,
  location: string,
): Promise<number> {
  const row = await prisma.warehouseLocationStock.findFirst({
    where: { tenantId, warehouseItemId, location },
    select: { qty: true },
  });
  return row ? row.qty.toNumber() : 0;
}

/**
 * Aggiorna (upsert) la quantità di un reparto per un prodotto.
 * delta può essere negativo (scarico) o positivo (carico/trasferimento in ingresso).
 * NON va sotto 0: lancia errore se il delta supera lo stock disponibile.
 */
async function adjustLocationStock(
  tenantId: string,
  warehouseItemId: string,
  location: string,
  delta: number,
): Promise<void> {
  const existing = await prisma.warehouseLocationStock.findFirst({
    where: { tenantId, warehouseItemId, location },
  });
  const current = existing ? existing.qty.toNumber() : 0;
  const next = current + delta;
  if (next < 0) {
    throw new Error(
      `Stock insufficiente in ${location}: disponibili ${current}, richiesti ${Math.abs(delta)}`,
    );
  }
  await prisma.warehouseLocationStock.upsert({
    where: {
      tenantId_warehouseItemId_location: { tenantId, warehouseItemId, location },
    },
    update: { qty: next, updatedAt: new Date() },
    create: { tenantId, warehouseItemId, location, qty: next },
  });
}

export const warehouseRepository = {
  /* ── Prodotti (WarehouseItem) ─────────────────────────────────── */

  async listItems(tenantId: string): Promise<StockItem[]> {
    const rows = await prisma.warehouseItem.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
    return rows.map(mapItem);
  },

  /**
   * Lista prodotti con scorte per reparto aggregate.
   * qty sul prodotto = centrale; locationStocks = reparti; totalQty = somma.
   */
  async listItemsWithLocations(tenantId: string): Promise<StockItemWithLocations[]> {
    const [rows, locRows] = await Promise.all([
      prisma.warehouseItem.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
      prisma.warehouseLocationStock.findMany({ where: { tenantId } }),
    ]);

    const locByItem = new Map<string, LocationStock[]>();
    for (const loc of locRows) {
      const arr = locByItem.get(loc.warehouseItemId) ?? [];
      arr.push({ location: loc.location as WarehouseLocation, qty: loc.qty.toNumber() });
      locByItem.set(loc.warehouseItemId, arr);
    }

    return rows.map((row) => {
      const base = mapItem(row);
      const locationStocks = locByItem.get(row.id) ?? [];
      const deptTotal = locationStocks.reduce((s, l) => s + l.qty, 0);
      return { ...base, locationStocks, totalQty: base.qty + deptTotal };
    });
  },

  async getItem(tenantId: string, id: string): Promise<StockItem | null> {
    const row = await prisma.warehouseItem.findFirst({ where: { id, tenantId } });
    return row ? mapItem(row) : null;
  },

  async findByName(tenantId: string, name: string): Promise<StockItem | null> {
    const row = await prisma.warehouseItem.findFirst({
      where: { tenantId, name: { equals: name, mode: "insensitive" } },
    });
    return row ? mapItem(row) : null;
  },

  async createItem(tenantId: string, data: Omit<StockItem, "id">): Promise<StockItem> {
    const row = await prisma.warehouseItem.create({
      data: {
        tenantId,
        name: data.name,
        category: data.category,
        qty: data.qty,
        unit: data.unit,
        minStock: data.minStock,
        costPerUnit: data.costPerUnit,
        supplier: data.supplier,
      },
    });
    return mapItem(row);
  },

  async updateItem(
    tenantId: string,
    id: string,
    updates: Partial<StockItem>,
  ): Promise<StockItem | null> {
    const existing = await prisma.warehouseItem.findFirst({ where: { id, tenantId } });
    if (!existing) return null;
    const row = await prisma.warehouseItem.update({
      where: { id },
      data: {
        name: updates.name,
        category: updates.category,
        qty: updates.qty,
        unit: updates.unit,
        minStock: updates.minStock,
        costPerUnit: updates.costPerUnit,
        supplier: updates.supplier,
      },
    });
    return mapItem(row);
  },

  async deleteItem(tenantId: string, id: string): Promise<boolean> {
    const existing = await prisma.warehouseItem.findFirst({ where: { id, tenantId } });
    if (!existing) return false;
    await prisma.warehouseItem.delete({ where: { id } });
    return true;
  },

  /* ── Scorte per reparto ───────────────────────────────────────── */

  /** Stock di un reparto specifico per un prodotto (0 se non esiste). */
  async getLocationStock(
    tenantId: string,
    warehouseItemId: string,
    location: string,
  ): Promise<number> {
    return getLocationQty(tenantId, warehouseItemId, location);
  },

  /** Tutte le scorte per reparto di un prodotto. */
  async listLocationStocksForItem(
    tenantId: string,
    warehouseItemId: string,
  ): Promise<LocationStock[]> {
    const rows = await prisma.warehouseLocationStock.findMany({
      where: { tenantId, warehouseItemId },
    });
    return rows.map((r) => ({
      location: r.location as WarehouseLocation,
      qty: r.qty.toNumber(),
    }));
  },

  /* ── Movimenti ────────────────────────────────────────────────── */

  async listMovements(tenantId: string): Promise<StockMovement[]> {
    const rows = await prisma.warehouseMovement.findMany({
      where: { tenantId },
      include: { item: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(mapMovement);
  },

  /** Crea un semplice movimento (carico/scarico/scarico_comanda) senza logica reparto. */
  async createMovement(params: {
    tenantId: string;
    warehouseItemId: string;
    type: MovementType;
    qty: number;
    unit: string;
    reason: string;
    fromLocation?: string | null;
    toLocation?: string | null;
    note?: string | null;
    orderId?: string;
  }): Promise<StockMovement> {
    const row = await prisma.warehouseMovement.create({
      data: {
        tenantId: params.tenantId,
        warehouseItemId: params.warehouseItemId,
        date: new Date(),
        type: params.type,
        qty: params.qty,
        unit: params.unit,
        reason: params.reason,
        fromLocation: params.fromLocation ?? null,
        toLocation: params.toLocation ?? null,
        note: params.note ?? null,
        orderId: params.orderId || null,
      },
      include: { item: { select: { name: true } } },
    });
    return mapMovement(row);
  },

  /**
   * Trasferimento: sposta qty da una location a un'altra.
   *
   * - fromLocation MAGAZZINO_CENTRALE → decrementa WarehouseItem.qty
   * - fromLocation reparto → decrementa WarehouseLocationStock
   * - toLocation MAGAZZINO_CENTRALE → incrementa WarehouseItem.qty
   * - toLocation reparto → incrementa/crea WarehouseLocationStock
   *
   * Crea un movimento di tipo "trasferimento" e ritorna il movimento.
   */
  async transfer(params: {
    tenantId: string;
    warehouseItemId: string;
    fromLocation: WarehouseLocation;
    toLocation: WarehouseLocation;
    qty: number;
    reason: string;
    note?: string | null;
  }): Promise<StockMovement> {
    const { tenantId, warehouseItemId, fromLocation, toLocation, qty, reason, note } = params;

    if (qty <= 0) throw new Error("La quantità deve essere > 0");
    if (fromLocation === toLocation) throw new Error("La location di partenza e destinazione devono essere diverse");

    const item = await prisma.warehouseItem.findFirst({ where: { id: warehouseItemId, tenantId } });
    if (!item) throw new Error("Prodotto non trovato");

    // Verifica e decrementa la source
    if (fromLocation === CENTRAL) {
      const currentQty = item.qty.toNumber();
      if (currentQty < qty) {
        throw new Error(
          `Stock insufficiente in Magazzino Centrale: disponibili ${currentQty} ${item.unit}, richiesti ${qty}`,
        );
      }
      await prisma.warehouseItem.update({
        where: { id: warehouseItemId },
        data: { qty: currentQty - qty },
      });
    } else {
      await adjustLocationStock(tenantId, warehouseItemId, fromLocation, -qty);
    }

    // Incrementa la destination
    if (toLocation === CENTRAL) {
      await prisma.warehouseItem.update({
        where: { id: warehouseItemId },
        data: { qty: { increment: qty } },
      });
    } else {
      await adjustLocationStock(tenantId, warehouseItemId, toLocation, qty);
    }

    // Registra il movimento
    const row = await prisma.warehouseMovement.create({
      data: {
        tenantId,
        warehouseItemId,
        date: new Date(),
        type: "trasferimento",
        qty,
        unit: item.unit,
        reason,
        fromLocation,
        toLocation,
        note: note ?? null,
      },
      include: { item: { select: { name: true } } },
    });
    return mapMovement(row);
  },

  /**
   * Scarico da reparto specifico.
   * Se lo stock del reparto è insufficiente, ritorna { ok: false, fromCentral: false }.
   * Se ok, aggiorna WarehouseLocationStock e crea movimento.
   * Se il reparto non ha abbastanza stock, ricade sul centrale (se allowFallback=true).
   */
  async dischargeFromLocation(params: {
    tenantId: string;
    warehouseItemId: string;
    location: WarehouseLocation;
    qty: number;
    reason: string;
    note?: string | null;
    orderId?: string;
    allowFallback?: boolean;
  }): Promise<{
    ok: boolean;
    dischargedFrom: WarehouseLocation;
    alert?: string;
  }> {
    const { tenantId, warehouseItemId, location, qty, reason, note, orderId, allowFallback = true } = params;

    const item = await prisma.warehouseItem.findFirst({ where: { id: warehouseItemId, tenantId } });
    if (!item) return { ok: false, dischargedFrom: location, alert: "Prodotto non trovato" };

    const locationQty = await getLocationQty(tenantId, warehouseItemId, location);

    if (locationQty >= qty) {
      // Scarica dal reparto
      await adjustLocationStock(tenantId, warehouseItemId, location, -qty);
      await prisma.warehouseMovement.create({
        data: {
          tenantId,
          warehouseItemId,
          date: new Date(),
          type: "scarico_comanda",
          qty,
          unit: item.unit,
          reason,
          fromLocation: location,
          toLocation: null,
          note: note ?? null,
          orderId: orderId ?? null,
        },
      });
      return { ok: true, dischargedFrom: location };
    }

    // Stock reparto insufficiente
    if (!allowFallback) {
      return {
        ok: false,
        dischargedFrom: location,
        alert: `Stock insufficiente in ${location}: disponibili ${locationQty}, richiesti ${qty}`,
      };
    }

    // Fallback su centrale
    const centralQty = item.qty.toNumber();
    const actualQty = Math.min(qty, centralQty);
    if (actualQty > 0) {
      await prisma.warehouseItem.update({
        where: { id: warehouseItemId },
        data: { qty: { decrement: actualQty } },
      });
      await prisma.warehouseMovement.create({
        data: {
          tenantId,
          warehouseItemId,
          date: new Date(),
          type: "scarico_comanda",
          qty: actualQty,
          unit: item.unit,
          reason,
          fromLocation: CENTRAL,
          toLocation: null,
          note: `Fallback da ${location} (stock: ${locationQty})${note ? " | " + note : ""}`,
          orderId: orderId ?? null,
        },
      });
    }

    return {
      ok: true,
      dischargedFrom: CENTRAL,
      alert:
        locationQty < qty
          ? `${location} insufficiente (${locationQty}/${qty}): scaricato dal Magazzino Centrale`
          : undefined,
    };
  },

  /**
   * Rettifica: imposta direttamente la quantità di una location.
   * Registra il movimento di rettifica.
   */
  async rectify(params: {
    tenantId: string;
    warehouseItemId: string;
    location: WarehouseLocation;
    newQty: number;
    reason: string;
    note?: string | null;
  }): Promise<StockMovement> {
    const { tenantId, warehouseItemId, location, newQty, reason, note } = params;
    if (newQty < 0) throw new Error("La quantità non può essere negativa");

    const item = await prisma.warehouseItem.findFirst({ where: { id: warehouseItemId, tenantId } });
    if (!item) throw new Error("Prodotto non trovato");

    let oldQty: number;

    if (location === CENTRAL) {
      oldQty = item.qty.toNumber();
      await prisma.warehouseItem.update({
        where: { id: warehouseItemId },
        data: { qty: newQty },
      });
    } else {
      oldQty = await getLocationQty(tenantId, warehouseItemId, location);
      await prisma.warehouseLocationStock.upsert({
        where: {
          tenantId_warehouseItemId_location: { tenantId, warehouseItemId, location },
        },
        update: { qty: newQty, updatedAt: new Date() },
        create: { tenantId, warehouseItemId, location, qty: newQty },
      });
    }

    const delta = newQty - oldQty;
    const row = await prisma.warehouseMovement.create({
      data: {
        tenantId,
        warehouseItemId,
        date: new Date(),
        type: "rettifica",
        qty: Math.abs(delta),
        unit: item.unit,
        reason,
        fromLocation: location,
        toLocation: null,
        note: `Rettifica: ${oldQty} → ${newQty}${note ? " | " + note : ""}`,
      },
      include: { item: { select: { name: true } } },
    });
    return mapMovement(row);
  },

  /* ── Attrezzature ─────────────────────────────────────────────── */

  async listEquipment(tenantId: string): Promise<WarehouseEquipment[]> {
    const rows = await prisma.warehouseEquipment.findMany({
      where: { tenantId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return rows.map(mapEquipment);
  },

  async getEquipment(tenantId: string, id: string): Promise<WarehouseEquipment | null> {
    const row = await prisma.warehouseEquipment.findFirst({ where: { tenantId, id } });
    return row ? mapEquipment(row) : null;
  },

  async createEquipment(
    tenantId: string,
    data: Omit<WarehouseEquipment, "id">,
  ): Promise<WarehouseEquipment> {
    const row = await prisma.warehouseEquipment.create({
      data: {
        tenantId,
        name: data.name,
        category: data.category,
        qty: data.qty,
        status: data.status,
        location: data.location,
        value: data.value,
      },
    });
    return mapEquipment(row);
  },

  async updateEquipment(
    tenantId: string,
    id: string,
    updates: Partial<WarehouseEquipment>,
  ): Promise<WarehouseEquipment | null> {
    const existing = await prisma.warehouseEquipment.findFirst({ where: { tenantId, id } });
    if (!existing) return null;
    const row = await prisma.warehouseEquipment.update({
      where: { id },
      data: {
        name: updates.name,
        category: updates.category,
        qty: updates.qty,
        status: updates.status,
        location: updates.location,
        value: updates.value,
      },
    });
    return mapEquipment(row);
  },

  async deleteEquipment(tenantId: string, id: string): Promise<boolean> {
    const existing = await prisma.warehouseEquipment.findFirst({
      where: { tenantId, id },
      select: { id: true },
    });
    if (!existing) return false;
    await prisma.warehouseEquipment.delete({ where: { id } });
    return true;
  },
};
