import { prisma } from "@/lib/db/prisma";

function mapLicense(row: {
  id: string;
  tenantId: string;
  licenseKey: string;
  status: string;
  plan: string;
  billingCycle: string;
  seats: number;
  usedSeats: number;
  activatedAt: Date;
  expiresAt: Date;
  tenant: { name: string };
}) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    tenantName: row.tenant.name,
    key: row.licenseKey,
    status: row.status,
    plan: row.plan,
    billingCycle: row.billingCycle,
    seats: row.seats,
    usedSeats: row.usedSeats,
    activatedAt: row.activatedAt.toISOString().slice(0, 10),
    expiresAt: row.expiresAt.toISOString().slice(0, 10),
  };
}

function mapEmailConfig(row: {
  id: string;
  tenantId: string;
  host: string;
  port: number;
  username: string;
  fromAddress: string;
  secure: boolean;
  lastTestStatus: string | null;
  lastTestedAt: Date | null;
  tenant: { name: string };
}) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    tenantName: row.tenant.name,
    host: row.host,
    port: row.port,
    username: row.username,
    fromAddress: row.fromAddress,
    secure: row.secure,
    lastTestStatus: row.lastTestStatus,
    lastTestedAt: row.lastTestedAt ? row.lastTestedAt.toISOString() : null,
  };
}

export const adminRepository = {
  async tenants() {
    return prisma.tenant.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, plan: true, createdAt: true, users: { select: { id: true } } },
    });
  },
  async licenses() {
    const rows = await prisma.tenantLicense.findMany({
      include: { tenant: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(mapLicense);
  },
  async setLicenseStatus(id: string, status: "trial" | "active" | "expired" | "suspended") {
    const row = await prisma.tenantLicense.update({
      where: { id },
      data: { status },
      include: { tenant: { select: { name: true } } },
    });
    return mapLicense(row);
  },
  async emailConfigs() {
    const rows = await prisma.tenantEmailConfig.findMany({
      include: { tenant: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(mapEmailConfig);
  },
  async upsertEmailConfig(tenantId: string, payload: {
    host: string;
    port: number;
    username: string;
    password: string;
    fromAddress: string;
    secure: boolean;
  }) {
    const row = await prisma.tenantEmailConfig.upsert({
      where: { tenantId },
      update: payload,
      create: { tenantId, ...payload },
      include: { tenant: { select: { name: true } } },
    });
    return mapEmailConfig(row);
  },
  async testEmailConfig(tenantId: string, success: boolean) {
    const row = await prisma.tenantEmailConfig.update({
      where: { tenantId },
      data: {
        lastTestStatus: success ? "ok" : "fail",
        lastTestedAt: new Date(),
      },
      include: { tenant: { select: { name: true } } },
    });
    return mapEmailConfig(row);
  },
};
