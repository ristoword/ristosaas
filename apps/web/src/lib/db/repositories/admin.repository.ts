import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

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
  async createTenantWithLicense(payload: {
    name: string;
    slug: string;
    plan: "restaurant_only" | "hotel_only" | "all_included";
    billingCycle: "monthly" | "annual";
    seats: number;
    adminUser: {
      username: string;
      email: string;
      name: string;
      password: string;
      role?: string;
    };
  }) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const enabledFeaturesByPlan: Record<"restaurant_only" | "hotel_only" | "all_included", Array<"restaurant" | "hotel" | "integration_room_charge" | "integration_unified_folio" | "integration_meal_plans">> = {
      restaurant_only: ["restaurant"],
      hotel_only: ["hotel"],
      all_included: ["restaurant", "hotel", "integration_room_charge", "integration_unified_folio", "integration_meal_plans"],
    };

    return prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: payload.name,
          slug: payload.slug,
          plan: payload.plan,
        },
      });

      const featureRows = enabledFeaturesByPlan[payload.plan];
      if (featureRows.length > 0) {
        await tx.tenantFeature.createMany({
          data: featureRows.map((code) => ({
            tenantId: tenant.id,
            code,
            enabled: true,
          })),
        });
      }

      const normalizedKey = payload.slug.replace(/[^a-z0-9]+/gi, "-").toUpperCase();
      const license = await tx.tenantLicense.create({
        data: {
          tenantId: tenant.id,
          licenseKey: `RW-${normalizedKey}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          status: "active",
          plan: payload.plan,
          billingCycle: payload.billingCycle,
          seats: payload.seats,
          usedSeats: 1,
          activatedAt: now,
          expiresAt,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          username: payload.adminUser.username,
          email: payload.adminUser.email,
          name: payload.adminUser.name,
          role: payload.adminUser.role ?? "owner",
          passwordHash: hashPassword(payload.adminUser.password),
          mustChangePassword: true,
        },
      });

      return {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
        },
        license: {
          id: license.id,
          key: license.licenseKey,
          status: license.status,
          plan: license.plan,
          seats: license.seats,
          usedSeats: license.usedSeats,
          expiresAt: license.expiresAt.toISOString(),
        },
        adminUser: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        },
      };
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
