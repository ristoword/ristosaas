import { prisma } from "@/lib/db/prisma";
import type { Customer } from "@/lib/api-client";

type CustomerTypeMap = Customer["type"];

function mapType(type: string): CustomerTypeMap {
  if (type === "vip" || type === "habitue" || type === "new") return type;
  return "walk-in";
}

function toDbType(type: CustomerTypeMap) {
  return type === "walk-in" ? "walk_in" : type;
}

function mapCustomer(row: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  visits: number;
  totalSpent: { toNumber: () => number };
  avgSpend: { toNumber: () => number };
  allergies: string | null;
  preferences: string | null;
  notes: string | null;
  lastVisit: Date | null;
}): Customer {
  return {
    id: row.id,
    name: row.name,
    email: row.email || "",
    phone: row.phone || "",
    type: mapType(row.type),
    visits: row.visits,
    totalSpent: row.totalSpent.toNumber(),
    avgSpend: row.avgSpend.toNumber(),
    allergies: row.allergies || "",
    preferences: row.preferences || "",
    notes: row.notes || "",
    lastVisit: row.lastVisit ? row.lastVisit.toISOString().slice(0, 10) : "",
  };
}

export const customersRepository = {
  async all(tenantId: string) {
    const rows = await prisma.customer.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
    return rows.map(mapCustomer);
  },
  async get(tenantId: string, id: string) {
    const row = await prisma.customer.findFirst({ where: { tenantId, id } });
    return row ? mapCustomer(row) : null;
  },
  async create(tenantId: string, data: Omit<Customer, "id">) {
    const row = await prisma.customer.create({
      data: {
        tenantId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        type: toDbType(data.type),
        visits: data.visits || 0,
        totalSpent: data.totalSpent || 0,
        avgSpend: data.avgSpend || 0,
        allergies: data.allergies || null,
        preferences: data.preferences || null,
        notes: data.notes || null,
        lastVisit: data.lastVisit ? new Date(`${data.lastVisit}T00:00:00Z`) : null,
      },
    });
    return mapCustomer(row);
  },
  async update(tenantId: string, id: string, updates: Partial<Customer>) {
    const exists = await prisma.customer.findFirst({ where: { tenantId, id } });
    if (!exists) return null;
    const row = await prisma.customer.update({
      where: { id },
      data: {
        name: updates.name,
        email: updates.email === undefined ? undefined : updates.email || null,
        phone: updates.phone === undefined ? undefined : updates.phone || null,
        type: updates.type ? toDbType(updates.type) : undefined,
        visits: updates.visits,
        totalSpent: updates.totalSpent,
        avgSpend: updates.avgSpend,
        allergies: updates.allergies === undefined ? undefined : updates.allergies || null,
        preferences: updates.preferences === undefined ? undefined : updates.preferences || null,
        notes: updates.notes === undefined ? undefined : updates.notes || null,
        lastVisit: updates.lastVisit ? new Date(`${updates.lastVisit}T00:00:00Z`) : undefined,
      },
    });
    return mapCustomer(row);
  },
  async delete(tenantId: string, id: string) {
    const exists = await prisma.customer.findFirst({ where: { tenantId, id } });
    if (!exists) return false;
    await prisma.customer.delete({ where: { id } });
    return true;
  },
};
