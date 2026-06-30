import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import { normalizeProductKey } from "@/lib/warehouse/bolla-import/categories";
import { syncCantinaWineFromLine, undoCantinaWineLine } from "@/lib/warehouse/bolla-import/cantina-sync";
import type {
  BollaDashboardDto,
  BollaImportDto,
  BollaImportLineDto,
  BollaImportStatus,
  ConfirmBollaLineInput,
} from "@/lib/warehouse/bolla-import/types";

type DecimalLike = { toNumber: () => number };

function mapLine(
  row: {
    id: string;
    lineOrder: number;
    description: string;
    quantity: DecimalLike;
    unit: string;
    unitPrice: DecimalLike | null;
    vatPct: DecimalLike | null;
    discountPct: DecimalLike | null;
    lineTotal: DecimalLike | null;
    lotNumber: string | null;
    expiryDate: Date | null;
    suggestedCategory: string;
    selectedCategory: string;
    warehouseLocation: string;
    warehouseItemId: string | null;
    wineCellarItemId: string | null;
    matchStatus: string;
    selected: boolean;
    imported: boolean;
  },
  itemName?: string | null,
  wineName?: string | null,
): BollaImportLineDto {
  return {
    id: row.id,
    lineOrder: row.lineOrder,
    description: row.description,
    quantity: row.quantity.toNumber(),
    unit: row.unit,
    unitPrice: row.unitPrice?.toNumber() ?? null,
    vatPct: row.vatPct?.toNumber() ?? null,
    discountPct: row.discountPct?.toNumber() ?? null,
    lineTotal: row.lineTotal?.toNumber() ?? null,
    lotNumber: row.lotNumber,
    expiryDate: row.expiryDate ? row.expiryDate.toISOString().slice(0, 10) : null,
    suggestedCategory: row.suggestedCategory,
    selectedCategory: row.selectedCategory,
    warehouseLocation: row.warehouseLocation,
    warehouseItemId: row.warehouseItemId,
    warehouseItemName: itemName ?? wineName ?? null,
    wineCellarItemId: row.wineCellarItemId,
    wineCellarItemName: wineName ?? null,
    matchStatus: row.matchStatus as BollaImportLineDto["matchStatus"],
    selected: row.selected,
    imported: row.imported,
  };
}

function mapImport(
  row: {
    id: string;
    supplierId: string | null;
    supplierName: string;
    documentNumber: string | null;
    documentDate: Date | null;
    bollaNumber: string | null;
    invoiceNumber: string | null;
    vatAmount: DecimalLike | null;
    totalAmount: DecimalLike | null;
    status: BollaImportStatus;
    currentStep: string;
    progressPct: number;
    errorMessage: string | null;
    documentMime: string | null;
    documentFileName: string | null;
    ocrConfidence: number | null;
    lineCount: number;
    matchedCount: number;
    newCount: number;
    durationMs: number | null;
    createdByName: string | null;
    createdAt: Date;
    importedAt: Date | null;
    lines?: Array<Parameters<typeof mapLine>[0] & { warehouseItemId: string | null }>;
  },
  itemNames: Map<string, string>,
  wineNames: Map<string, string> = new Map(),
): BollaImportDto {
  return {
    id: row.id,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    documentNumber: row.documentNumber,
    documentDate: row.documentDate ? row.documentDate.toISOString().slice(0, 10) : null,
    bollaNumber: row.bollaNumber,
    invoiceNumber: row.invoiceNumber,
    vatAmount: row.vatAmount?.toNumber() ?? null,
    totalAmount: row.totalAmount?.toNumber() ?? null,
    status: row.status,
    currentStep: row.currentStep,
    progressPct: row.progressPct,
    errorMessage: row.errorMessage,
    documentMime: row.documentMime,
    documentFileName: row.documentFileName,
    ocrConfidence: row.ocrConfidence,
    lineCount: row.lineCount,
    matchedCount: row.matchedCount,
    newCount: row.newCount,
    durationMs: row.durationMs,
    createdByName: row.createdByName,
    createdAt: row.createdAt.toISOString(),
    importedAt: row.importedAt ? row.importedAt.toISOString() : null,
    lines: (row.lines ?? []).map((l) =>
      mapLine(
        l,
        l.warehouseItemId ? itemNames.get(l.warehouseItemId) ?? null : null,
        l.wineCellarItemId ? wineNames.get(l.wineCellarItemId) ?? null : null,
      ),
    ),
  };
}

export const warehouseBollaImportRepository = {
  async createImport(params: {
    tenantId: string;
    supplierId?: string | null;
    supplierName: string;
    documentMime: string;
    documentBase64: string;
    documentFileName: string;
    defaultWarehouseLocation?: string;
    userId?: string;
    userName?: string;
  }) {
    const row = await prisma.warehouseBollaImport.create({
      data: {
        tenantId: params.tenantId,
        supplierId: params.supplierId ?? null,
        supplierName: params.supplierName,
        documentMime: params.documentMime,
        documentBase64: params.documentBase64,
        documentFileName: params.documentFileName,
        defaultWarehouseLocation: params.defaultWarehouseLocation ?? "MAGAZZINO_CENTRALE",
        createdByUserId: params.userId ?? null,
        createdByName: params.userName ?? null,
        status: "queued",
        currentStep: "queued",
      },
    });
    await this.addAudit(params.tenantId, row.id, "created", { fileName: params.documentFileName }, params.userId, params.userName);
    return row.id;
  },

  async updateProgress(
    tenantId: string,
    id: string,
    patch: {
      status?: BollaImportStatus;
      currentStep?: string;
      progressPct?: number;
      errorMessage?: string | null;
      ocrConfidence?: number | null;
      documentNumber?: string | null;
      documentDate?: Date | null;
      bollaNumber?: string | null;
      invoiceNumber?: string | null;
      vatAmount?: number | null;
      totalAmount?: number | null;
      lineCount?: number;
      matchedCount?: number;
      newCount?: number;
      startedAt?: Date;
      completedAt?: Date;
      durationMs?: number;
    },
  ) {
    await prisma.warehouseBollaImport.updateMany({
      where: { id, tenantId },
      data: {
        ...patch,
        vatAmount: patch.vatAmount != null ? patch.vatAmount : undefined,
        totalAmount: patch.totalAmount != null ? patch.totalAmount : undefined,
      },
    });
  },

  async replaceLines(
    tenantId: string,
    importId: string,
    lines: Array<{
      lineOrder: number;
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number | null;
      vatPct: number | null;
      discountPct: number | null;
      lineTotal: number | null;
      lotNumber: string | null;
      expiryDate: Date | null;
      suggestedCategory: string;
      selectedCategory: string;
      warehouseLocation: string;
      warehouseItemId: string | null;
      wineCellarItemId?: string | null;
      matchStatus: string;
    }>,
  ) {
    await prisma.$transaction([
      prisma.warehouseBollaImportLine.deleteMany({ where: { importId, tenantId } }),
      prisma.warehouseBollaImportLine.createMany({
        data: lines.map((l) => ({
          importId,
          tenantId,
          ...l,
        })),
      }),
    ]);
  },

  async getById(tenantId: string, id: string): Promise<BollaImportDto | null> {
    const row = await prisma.warehouseBollaImport.findFirst({
      where: { id, tenantId },
      include: { lines: { orderBy: { lineOrder: "asc" } } },
    });
    if (!row) return null;
    const itemIds = row.lines.map((l) => l.warehouseItemId).filter(Boolean) as string[];
    const wineIds = row.lines.map((l) => l.wineCellarItemId).filter(Boolean) as string[];
    const [items, wines] = await Promise.all([
      itemIds.length
        ? prisma.warehouseItem.findMany({ where: { tenantId, id: { in: itemIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
      wineIds.length
        ? prisma.wineCellarItem.findMany({ where: { tenantId, id: { in: wineIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
    ]);
    const itemNames = new Map(items.map((i) => [i.id, i.name]));
    const wineNames = new Map(wines.map((w) => [w.id, w.name]));
    return mapImport(row, itemNames, wineNames);
  },

  async getDocument(tenantId: string, id: string) {
    return prisma.warehouseBollaImport.findFirst({
      where: { id, tenantId },
      select: {
        documentBase64: true,
        documentMime: true,
        documentFileName: true,
      },
    });
  },

  async listRecent(tenantId: string, limit = 10) {
    const rows = await prisma.warehouseBollaImport.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        supplierName: true,
        status: true,
        lineCount: true,
        matchedCount: true,
        newCount: true,
        createdAt: true,
        durationMs: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      supplierName: r.supplierName,
      status: r.status as BollaImportStatus,
      lineCount: r.lineCount,
      matchedCount: r.matchedCount,
      newCount: r.newCount,
      createdAt: r.createdAt.toISOString(),
      durationMs: r.durationMs,
    }));
  },

  async getDashboard(tenantId: string): Promise<BollaDashboardDto> {
    const [recentImports, agg] = await Promise.all([
      this.listRecent(tenantId, 8),
      prisma.warehouseBollaImport.aggregate({
        where: { tenantId },
        _count: { _all: true },
        _avg: { durationMs: true },
        _sum: { matchedCount: true, newCount: true },
      }),
    ]);
    const ocrErrors = await prisma.warehouseBollaImport.count({
      where: { tenantId, status: "failed" },
    });
    const completed = await prisma.warehouseBollaImport.findMany({
      where: { tenantId, status: "completed", durationMs: { not: null } },
      select: { durationMs: true },
      take: 50,
      orderBy: { createdAt: "desc" },
    });
    const avgDurationMs =
      completed.length > 0
        ? Math.round(completed.reduce((s, r) => s + (r.durationMs ?? 0), 0) / completed.length)
        : agg._avg.durationMs != null
          ? Math.round(agg._avg.durationMs)
          : null;

    return {
      recentImports,
      stats: {
        totalImports: agg._count._all,
        itemsRecognized: agg._sum.matchedCount ?? 0,
        itemsNew: agg._sum.newCount ?? 0,
        ocrErrors,
        avgDurationMs,
      },
    };
  },

  async updateLines(tenantId: string, importId: string, lines: ConfirmBollaLineInput[]) {
    for (const line of lines) {
      await prisma.warehouseBollaImportLine.updateMany({
        where: { id: line.id, importId, tenantId },
        data: {
          selected: line.selected,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice ?? undefined,
          vatPct: line.vatPct ?? undefined,
          selectedCategory: line.selectedCategory,
          warehouseLocation: line.warehouseLocation,
          warehouseItemId: line.warehouseItemId ?? undefined,
          matchStatus: line.createProduct ? "new" : line.warehouseItemId ? "matched" : "new",
        },
      });
    }
  },

  async learnCategory(tenantId: string, productKey: string, category: string) {
    await prisma.warehouseCategoryLearning.upsert({
      where: { tenantId_productKey: { tenantId, productKey } },
      create: { tenantId, productKey, category, hitCount: 1 },
      update: { category, hitCount: { increment: 1 }, updatedAt: new Date() },
    });
  },

  async getLearnedCategory(tenantId: string, productKey: string): Promise<string | null> {
    const row = await prisma.warehouseCategoryLearning.findUnique({
      where: { tenantId_productKey: { tenantId, productKey } },
    });
    return row?.category ?? null;
  },

  async addAudit(
    tenantId: string,
    importId: string,
    action: string,
    detail?: Record<string, unknown>,
    userId?: string,
    userName?: string,
  ) {
    await prisma.warehouseBollaImportAuditLog.create({
      data: {
        tenantId,
        importId,
        action,
        detail: (detail ?? undefined) as Prisma.InputJsonValue | undefined,
        userId: userId ?? null,
        userName: userName ?? null,
      },
    });
  },

  async listAudit(tenantId: string, importId: string) {
    return prisma.warehouseBollaImportAuditLog.findMany({
      where: { tenantId, importId },
      orderBy: { createdAt: "desc" },
    });
  },

  async executeImport(
    tenantId: string,
    importId: string,
    supplierName: string,
    userId?: string,
    userName?: string,
  ) {
    const started = Date.now();
    const imp = await prisma.warehouseBollaImport.findFirst({
      where: { id: importId, tenantId },
      include: { lines: { where: { selected: true }, orderBy: { lineOrder: "asc" } } },
    });
    if (!imp) throw new Error("Importazione non trovata.");
    if (imp.status === "completed") throw new Error("Importazione già completata.");
    if (imp.lines.length === 0) throw new Error("Nessuna riga selezionata.");

    const code = imp.bollaNumber ?? imp.documentNumber ?? imp.id.slice(-8).toUpperCase();
    const syncCantina = imp.defaultWarehouseLocation === "CANTINA";

    await prisma.$transaction(async (tx) => {
      for (const line of imp.lines) {
        const qty = line.quantity.toNumber();
        if (qty <= 0) continue;
        const unitCost = line.unitPrice?.toNumber() ?? 0;

        let itemId = line.warehouseItemId;
        let prevQty = 0;
        let prevCost = 0;

        if (!itemId && line.matchStatus === "new") {
          const created = await tx.warehouseItem.create({
            data: {
              tenantId,
              name: line.description.trim(),
              category: line.selectedCategory,
              qty: 0,
              unit: line.unit || "pz",
              minStock: 0,
              costPerUnit: unitCost,
              supplier: supplierName,
              lotNumber: line.lotNumber,
              expiryDate: line.expiryDate,
            },
          });
          itemId = created.id;
          await tx.warehouseBollaImportLine.update({
            where: { id: line.id },
            data: { createdItemId: created.id, warehouseItemId: created.id, matchStatus: "created" },
          });
        }

        if (!itemId) continue;

        const stockItem = await tx.warehouseItem.findFirst({ where: { id: itemId, tenantId } });
        if (!stockItem) continue;

        prevQty = stockItem.qty.toNumber();
        prevCost = stockItem.costPerUnit.toNumber();
        const newQty = prevQty + qty;
        const weightedCost =
          newQty > 0 && unitCost > 0
            ? (prevQty * prevCost + qty * unitCost) / newQty
            : prevCost || unitCost;

        await tx.warehouseItem.update({
          where: { id: itemId },
          data: {
            qty: newQty,
            costPerUnit: Number(weightedCost.toFixed(4)),
            category: line.selectedCategory,
            supplier: supplierName,
            lotNumber: line.lotNumber ?? stockItem.lotNumber,
            expiryDate: line.expiryDate ?? stockItem.expiryDate,
          },
        });

        const movement = await tx.warehouseMovement.create({
          data: {
            tenantId,
            warehouseItemId: itemId,
            date: new Date(),
            type: "carico",
            qty,
            unit: line.unit,
            reason: `Bolla AI ${code}`,
            toLocation: line.warehouseLocation,
            note: line.lotNumber ? `Lotto ${line.lotNumber}` : null,
            bollaImportId: importId,
          },
        });

        if (unitCost > 0) {
          await tx.warehouseCostHistory.create({
            data: {
              tenantId,
              warehouseItemId: itemId,
              unitCost: Number(weightedCost.toFixed(4)),
              source: `bolla_ai:${code}`,
              effectiveAt: new Date(),
            },
          });
        }

        if (line.lotNumber) {
          await tx.warehouseLot.upsert({
            where: {
              tenantId_warehouseItemId_lotCode: {
                tenantId,
                warehouseItemId: itemId,
                lotCode: line.lotNumber,
              },
            },
            create: {
              tenantId,
              warehouseItemId: itemId,
              lotCode: line.lotNumber,
              qty,
              qtyRemaining: qty,
              purchaseUnitCost: unitCost,
              receivedAt: new Date(),
              expiresAt: line.expiryDate,
            },
            update: {
              qty: { increment: qty },
              qtyRemaining: { increment: qty },
              purchaseUnitCost: unitCost,
            },
          });
        }

        if (line.warehouseLocation && line.warehouseLocation !== "MAGAZZINO_CENTRALE") {
          await tx.warehouseLocationStock.upsert({
            where: {
              tenantId_warehouseItemId_location: {
                tenantId,
                warehouseItemId: itemId,
                location: line.warehouseLocation,
              },
            },
            create: { tenantId, warehouseItemId: itemId, location: line.warehouseLocation, qty },
            update: { qty: { increment: qty } },
          });
        }

        await tx.warehouseBollaImportLine.update({
          where: { id: line.id },
          data: {
            imported: true,
            movementId: movement.id,
            prevQty,
            prevCost,
          },
        });

        const productKey = normalizeProductKey(line.description);
        await tx.warehouseCategoryLearning.upsert({
          where: { tenantId_productKey: { tenantId, productKey } },
          create: { tenantId, productKey, category: line.selectedCategory, hitCount: 1 },
          update: { category: line.selectedCategory, hitCount: { increment: 1 } },
        });

        if (syncCantina) {
          await syncCantinaWineFromLine(tx, tenantId, line, supplierName);
        }
      }

      await tx.warehouseBollaImport.update({
        where: { id: importId },
        data: {
          status: "completed",
          currentStep: "completed",
          progressPct: 100,
          importedAt: new Date(),
          completedAt: new Date(),
          durationMs: Date.now() - started,
        },
      });
    });

    await this.addAudit(tenantId, importId, "imported", { lineCount: imp.lines.length }, userId, userName);
  },

  async undoImport(tenantId: string, importId: string, userId?: string, userName?: string) {
    const imp = await prisma.warehouseBollaImport.findFirst({
      where: { id: importId, tenantId, status: "completed" },
      include: { lines: { where: { imported: true } } },
    });
    if (!imp) throw new Error("Importazione non reversibile.");

    await prisma.$transaction(async (tx) => {
      for (const line of imp.lines) {
        if (line.wineCellarItemId) {
          await undoCantinaWineLine(tx, tenantId, line);
        }

        if (!line.warehouseItemId || !line.movementId) continue;
        const qty = line.quantity.toNumber();
        const item = await tx.warehouseItem.findFirst({ where: { id: line.warehouseItemId, tenantId } });
        if (!item) continue;

        const revertQty = Math.max(0, item.qty.toNumber() - qty);
        await tx.warehouseItem.update({
          where: { id: line.warehouseItemId },
          data: {
            qty: revertQty,
            costPerUnit: line.prevCost?.toNumber() ?? item.costPerUnit,
          },
        });

        if (line.warehouseLocation && line.warehouseLocation !== "MAGAZZINO_CENTRALE") {
          const loc = await tx.warehouseLocationStock.findFirst({
            where: { tenantId, warehouseItemId: line.warehouseItemId, location: line.warehouseLocation },
          });
          if (loc) {
            const next = Math.max(0, loc.qty.toNumber() - qty);
            await tx.warehouseLocationStock.update({ where: { id: loc.id }, data: { qty: next } });
          }
        }

        await tx.warehouseMovement.delete({ where: { id: line.movementId } });
        await tx.warehouseBollaImportLine.update({
          where: { id: line.id },
          data: { imported: false, movementId: null, wineCellarItemId: null, prevWineStock: null, wineCreated: false },
        });

        if (line.createdItemId) {
          const stillUsed = await tx.warehouseMovement.count({
            where: { warehouseItemId: line.createdItemId, id: { not: line.movementId } },
          });
          if (stillUsed === 0 && revertQty <= 0) {
            await tx.warehouseItem.delete({ where: { id: line.createdItemId } }).catch(() => undefined);
          }
        }
      }

      await tx.warehouseBollaImport.update({
        where: { id: importId },
        data: { status: "undone", currentStep: "undone", undoneAt: new Date() },
      });
    });

    await this.addAudit(tenantId, importId, "undone", {}, userId, userName);
  },
};
