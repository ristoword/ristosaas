import type { Prisma } from "@prisma/client";
import { matchWineItem } from "@/lib/warehouse/bolla-import/wine-matcher";

type Tx = Prisma.TransactionClient;

export async function syncCantinaWineFromLine(
  tx: Tx,
  tenantId: string,
  line: {
    id: string;
    description: string;
    quantity: { toNumber: () => number };
    unitPrice: { toNumber: () => number } | null;
    wineCellarItemId: string | null;
  },
  supplierName: string,
): Promise<{ wineCellarItemId: string; prevWineStock: number; wineCreated: boolean } | null> {
  const qty = Math.max(0, Math.round(line.quantity.toNumber()));
  if (qty <= 0) return null;

  const unitCost = line.unitPrice?.toNumber() ?? 0;

  let wineId = line.wineCellarItemId;
  let wineCreated = false;
  let prevWineStock = 0;

  if (wineId) {
    const existing = await tx.wineCellarItem.findFirst({ where: { id: wineId, tenantId } });
    if (!existing) wineId = null;
    else prevWineStock = existing.stock;
  }

  if (!wineId) {
    const wines = await tx.wineCellarItem.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });
    const match = matchWineItem(line.description, wines);
    if (match) {
      wineId = match.id;
      const existing = await tx.wineCellarItem.findFirst({ where: { id: wineId, tenantId } });
      prevWineStock = existing?.stock ?? 0;
    }
  }

  if (!wineId) {
    const sellingPrice = unitCost > 0 ? Number((unitCost * 2.5).toFixed(2)) : 0;
    const created = await tx.wineCellarItem.create({
      data: {
        tenantId,
        name: line.description.trim(),
        producer: supplierName,
        purchasePrice: unitCost,
        sellingPrice,
        stock: 0,
      },
    });
    wineId = created.id;
    wineCreated = true;
    prevWineStock = 0;
  }

  const wine = await tx.wineCellarItem.findFirst({ where: { id: wineId, tenantId } });
  if (!wine) return null;

  const newStock = wine.stock + qty;
  await tx.wineCellarItem.update({
    where: { id: wineId },
    data: {
      stock: newStock,
      ...(unitCost > 0 ? { purchasePrice: unitCost } : {}),
      ...(unitCost > 0 && wine.sellingPrice.toNumber() === 0
        ? { sellingPrice: Number((unitCost * 2.5).toFixed(2)) }
        : {}),
    },
  });

  await tx.warehouseBollaImportLine.update({
    where: { id: line.id },
    data: { wineCellarItemId: wineId, prevWineStock, wineCreated },
  });

  return { wineCellarItemId: wineId, prevWineStock, wineCreated };
}

export async function undoCantinaWineLine(
  tx: Tx,
  tenantId: string,
  line: {
    wineCellarItemId: string | null;
    prevWineStock: number | null;
    wineCreated: boolean;
    quantity: { toNumber: () => number };
  },
) {
  if (!line.wineCellarItemId) return;

  const qty = Math.max(0, Math.round(line.quantity.toNumber()));
  const wine = await tx.wineCellarItem.findFirst({ where: { id: line.wineCellarItemId, tenantId } });
  if (!wine) return;

  if (line.wineCreated) {
    const nextStock = Math.max(0, wine.stock - qty);
    if (nextStock <= 0) {
      await tx.wineCellarItem.delete({ where: { id: line.wineCellarItemId } }).catch(() => undefined);
    } else {
      await tx.wineCellarItem.update({ where: { id: line.wineCellarItemId }, data: { stock: nextStock } });
    }
    return;
  }

  const revertStock = line.prevWineStock ?? Math.max(0, wine.stock - qty);
  await tx.wineCellarItem.update({
    where: { id: line.wineCellarItemId },
    data: { stock: revertStock },
  });
}
