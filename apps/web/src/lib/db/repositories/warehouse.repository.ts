import { prisma } from "@/lib/db/prisma";
import type { StockItem, StockMovement, WarehouseEquipment } from "@/lib/api/types/warehouse";

type MovementType = StockMovement["type"];

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

export const warehouseRepository = {
  async listItems(tenantId: string) {
    const rows = await prisma.warehouseItem.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
    return rows.map(mapItem);
  },
  async getItem(tenantId: string, id: string) {
    const row = await prisma.warehouseItem.findFirst({
      where: { id, tenantId },
    });
    return row ? mapItem(row) : null;
  },
  async findByName(tenantId: string, name: string) {
    const row = await prisma.warehouseItem.findFirst({
      where: {
        tenantId,
        name: { equals: name, mode: "insensitive" },
      },
    });
    return row ? mapItem(row) : null;
  },
  async createItem(
    tenantId: string,
    data: Omit<StockItem, "id">,
  ) {
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
  ) {
    const existing = await prisma.warehouseItem.findFirst({
      where: { id, tenantId },
    });
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
  async deleteItem(tenantId: string, id: string) {
    const existing = await prisma.warehouseItem.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return false;
    await prisma.warehouseItem.delete({ where: { id } });
    return true;
  },
  async listMovements(tenantId: string) {
    const rows = await prisma.warehouseMovement.findMany({
      where: { tenantId },
      include: { item: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(mapMovement);
  },
  async createMovement(params: {
    tenantId: string;
    warehouseItemId: string;
    type: MovementType;
    qty: number;
    unit: string;
    reason: string;
    orderId?: string;
  }) {
    const row = await prisma.warehouseMovement.create({
      data: {
        tenantId: params.tenantId,
        warehouseItemId: params.warehouseItemId,
        date: new Date(),
        type: params.type,
        qty: params.qty,
        unit: params.unit,
        reason: params.reason,
        orderId: params.orderId || null,
      },
      include: { item: { select: { name: true } } },
    });
    return mapMovement(row);
  },
  async listEquipment(tenantId: string) {
    const rows = await prisma.warehouseEquipment.findMany({
      where: { tenantId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return rows.map(mapEquipment);
  },
  async getEquipment(tenantId: string, id: string) {
    const row = await prisma.warehouseEquipment.findFirst({
      where: { tenantId, id },
    });
    return row ? mapEquipment(row) : null;
  },
  async createEquipment(tenantId: string, data: Omit<WarehouseEquipment, "id">) {
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
  async updateEquipment(tenantId: string, id: string, updates: Partial<WarehouseEquipment>) {
    const existing = await prisma.warehouseEquipment.findFirst({
      where: { tenantId, id },
    });
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
  async deleteEquipment(tenantId: string, id: string) {
    const existing = await prisma.warehouseEquipment.findFirst({
      where: { tenantId, id },
      select: { id: true },
    });
    if (!existing) return false;
    await prisma.warehouseEquipment.delete({ where: { id } });
    return true;
  },
};
