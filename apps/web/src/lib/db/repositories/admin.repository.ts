import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { invalidateTenantAccessCache } from "@/lib/db/repositories/platform.repository";

type ProductPlan = "restaurant_only" | "hotel_only" | "all_included";

/**
 * Griglia percentuale per i tavoli di sala (UI usa left:%/top:%).
 */
function tableGridPositions(count: number) {
  const cols = 5;
  const leftPad = 12;
  const rightPad = 12;
  const topPad = 18;
  const rowGap = 24;
  const usableWidth = 100 - leftPad - rightPad;
  const colStep = usableWidth / (cols - 1);
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    out.push({
      x: Math.round(leftPad + col * colStep),
      y: Math.round(topPad + row * rowGap),
    });
  }
  return out;
}

/**
 * Crea le risorse minime necessarie al tenant appena nato per usare il
 * gestionale senza dover configurare nulla. Idempotente: se il tenant ha
 * gia sale/camere configurate non tocca nulla.
 *
 * Include:
 *  - piano ristorante: 1 sala "Sala 1" + 10 tavoli `T1..T10` in griglia.
 *  - piano hotel:      5 camere esempio con rate plan base.
 *
 * Volutamente NON crea ricette, menu item, staff, clienti, ordini finti:
 * sono dati editoriali del cliente.
 */
async function bootstrapMinimalTenantResources(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  tenantId: string,
  plan: ProductPlan,
) {
  const hasRestaurant = plan === "restaurant_only" || plan === "all_included";
  const hasHotel = plan === "hotel_only" || plan === "all_included";
  const summary = {
    restaurantRooms: 0,
    restaurantTables: 0,
    hotelRooms: 0,
    hotelRatePlans: 0,
  };

  if (hasRestaurant) {
    const existingTables = await tx.restaurantTable.count({ where: { tenantId } });
    const existingRooms = await tx.restaurantRoom.count({ where: { tenantId } });
    if (existingRooms === 0 && existingTables === 0) {
      const sala = await tx.restaurantRoom.create({
        data: { tenantId, name: "Sala 1", tables: 10 },
      });
      const positions = tableGridPositions(10);
      await tx.restaurantTable.createMany({
        data: positions.map((p, idx) => ({
          tenantId,
          roomId: sala.id,
          nome: `T${idx + 1}`,
          posti: 4,
          x: p.x,
          y: p.y,
          forma: idx % 2 === 0 ? "quadrato" : "tondo",
          stato: "libero",
        })),
      });
      summary.restaurantRooms = 1;
      summary.restaurantTables = 10;
    }
  }

  if (hasHotel) {
    const existingHotel = await tx.hotelRoom.count({ where: { tenantId } });
    if (existingHotel === 0) {
      const ratePlan = await tx.hotelRatePlan.upsert({
        where: { tenantId_code: { tenantId, code: "RP_CLASSIC_BB" } },
        update: {
          name: "Classic B&B",
          roomType: "Classic",
          boardType: "bed_breakfast",
          nightlyRate: "109.00",
          refundable: true,
          active: true,
        },
        create: {
          tenantId,
          code: "RP_CLASSIC_BB",
          name: "Classic B&B",
          roomType: "Classic",
          boardType: "bed_breakfast",
          nightlyRate: "109.00",
          refundable: true,
          active: true,
        },
      });
      summary.hotelRatePlans = 1;

      const hotelSeeds = [
        { code: "101", floor: 1, capacity: 2 },
        { code: "102", floor: 1, capacity: 2 },
        { code: "201", floor: 2, capacity: 2 },
        { code: "202", floor: 2, capacity: 2 },
        { code: "301", floor: 3, capacity: 2 },
      ] as const;
      for (const room of hotelSeeds) {
        await tx.hotelRoom.upsert({
          where: { tenantId_code: { tenantId, code: room.code } },
          update: {
            floor: room.floor,
            roomType: "Classic",
            capacity: room.capacity,
            status: "libera",
            ratePlanCode: ratePlan.code,
          },
          create: {
            tenantId,
            code: room.code,
            floor: room.floor,
            roomType: "Classic",
            capacity: room.capacity,
            status: "libera",
            ratePlanCode: ratePlan.code,
          },
        });
      }
      summary.hotelRooms = hotelSeeds.length;
    }
  }

  return summary;
}

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
      select: {
        id: true,
        name: true,
        plan: true,
        accessStatus: true,
        createdAt: true,
        users: { select: { id: true } },
      },
    });
  },
  async setTenantAccessStatus(tenantId: string, accessStatus: "active" | "blocked") {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { accessStatus },
    });
    invalidateTenantAccessCache(tenantId);
    const row = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        plan: true,
        accessStatus: true,
        createdAt: true,
        users: { select: { id: true } },
      },
    });
    if (!row) throw new Error("tenant_not_found");
    return row;
  },
  async createTenantWithLicense(payload: {
    name: string;
    slug: string;
    plan: "restaurant_only" | "hotel_only" | "all_included";
    billingCycle: "monthly" | "annual";
    seats: number;
    /** Months until license expires (default 12). Clamped 1–120. */
    licenseDurationMonths?: number;
    adminUser: {
      username: string;
      email: string;
      name: string;
      password: string;
      role?: string;
    };
  }) {
    const now = new Date();
    const rawMonths =
      payload.licenseDurationMonths != null && Number.isFinite(Number(payload.licenseDurationMonths))
        ? Math.floor(Number(payload.licenseDurationMonths))
        : 12;
    const months = Math.min(120, Math.max(1, rawMonths));
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + months);
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

      const bootstrap = await bootstrapMinimalTenantResources(tx, tenant.id, payload.plan);

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
        bootstrap,
      };
    });
  },
  async bootstrapTenantOperationalData(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, plan: true },
    });
    if (!tenant) throw new Error("tenant_not_found");

    const created = {
      ratePlans: 0,
      rooms: 0,
      restaurantRooms: 0,
      restaurantTables: 0,
      warehouseItems: 0,
      recipes: 0,
      menuItems: 0,
      dailyDishes: 0,
      staffMembers: 0,
      customers: 0,
      reports: 0,
    };

    await prisma.$transaction(async (tx) => {
      const ratePlans = [
        { code: "RP_CLASSIC_RO", name: "Classic Room Only", roomType: "Classic", boardType: "room_only", nightlyRate: "89.00", refundable: true },
        { code: "RP_CLASSIC_BB", name: "Classic B&B", roomType: "Classic", boardType: "bed_breakfast", nightlyRate: "109.00", refundable: true },
        { code: "RP_DELUXE_HB", name: "Deluxe Half Board", roomType: "Deluxe", boardType: "half_board", nightlyRate: "169.00", refundable: true },
        { code: "RP_FAMILY_FB", name: "Family Full Board", roomType: "Family", boardType: "full_board", nightlyRate: "229.00", refundable: true },
      ] as const;
      for (const plan of ratePlans) {
        await tx.hotelRatePlan.upsert({
          where: { tenantId_code: { tenantId, code: plan.code } },
          update: { ...plan, active: true },
          create: { tenantId, ...plan, active: true },
        });
      }
      created.ratePlans = ratePlans.length;

      const rooms = [
        { code: "101", floor: 1, roomType: "Classic", capacity: 2, status: "libera", ratePlanCode: "RP_CLASSIC_BB" },
        { code: "102", floor: 1, roomType: "Classic", capacity: 2, status: "pulita", ratePlanCode: "RP_CLASSIC_RO" },
        { code: "201", floor: 2, roomType: "Deluxe", capacity: 3, status: "libera", ratePlanCode: "RP_DELUXE_HB" },
        { code: "301", floor: 3, roomType: "Family", capacity: 4, status: "libera", ratePlanCode: "RP_FAMILY_FB" },
      ] as const;
      for (const room of rooms) {
        await tx.hotelRoom.upsert({
          where: { tenantId_code: { tenantId, code: room.code } },
          update: room,
          create: { tenantId, ...room },
        });
      }
      created.rooms = rooms.length;

      const sala = await tx.restaurantRoom.upsert({
        where: { tenantId_name: { tenantId, name: "Sala Principale" } },
        update: { tables: 12 },
        create: { tenantId, name: "Sala Principale", tables: 12 },
      });
      const terrazza = await tx.restaurantRoom.upsert({
        where: { tenantId_name: { tenantId, name: "Terrazza" } },
        update: { tables: 6 },
        create: { tenantId, name: "Terrazza", tables: 6 },
      });
      created.restaurantRooms = 2;

      const existingTables = await tx.restaurantTable.count({ where: { tenantId } });
      if (existingTables === 0) {
        const tableData = [
          { roomId: sala.id, nome: "T1", posti: 4, x: 120, y: 80, forma: "quadrato", stato: "libero" },
          { roomId: sala.id, nome: "T2", posti: 2, x: 220, y: 80, forma: "tondo", stato: "libero" },
          { roomId: sala.id, nome: "T3", posti: 6, x: 320, y: 80, forma: "quadrato", stato: "libero" },
          { roomId: terrazza.id, nome: "TR1", posti: 4, x: 120, y: 200, forma: "tondo", stato: "libero" },
          { roomId: terrazza.id, nome: "TR2", posti: 2, x: 220, y: 200, forma: "tondo", stato: "libero" },
        ] as const;
        await tx.restaurantTable.createMany({
          data: tableData.map((table) => ({ tenantId, ...table })),
        });
        created.restaurantTables = tableData.length;
      } else {
        created.restaurantTables = existingTables;
      }

      const stock = [
        { name: "Farina 00", category: "Secchi", qty: "120.000", unit: "kg", minStock: "50.000", costPerUnit: "0.8500", supplier: "Molino Rossi" },
        { name: "Mozzarella fior di latte", category: "Latticini", qty: "40.000", unit: "kg", minStock: "15.000", costPerUnit: "6.2000", supplier: "Caseificio Ferrara" },
        { name: "Pomodoro San Marzano", category: "Conserve", qty: "80.000", unit: "kg", minStock: "30.000", costPerUnit: "2.8000", supplier: "Ortofrutticola Sud" },
        { name: "Olio EVO", category: "Condimenti", qty: "45.000", unit: "L", minStock: "20.000", costPerUnit: "8.9000", supplier: "Oleificio Ferrante" },
        { name: "Vino Rosso Casa", category: "Bevande", qty: "36.000", unit: "bt", minStock: "12.000", costPerUnit: "4.5000", supplier: "Cantina Colli" },
      ] as const;
      for (const item of stock) {
        await tx.warehouseItem.upsert({
          where: { tenantId_name: { tenantId, name: item.name } },
          update: item,
          create: { tenantId, ...item },
        });
      }
      created.warehouseItems = stock.length;

      const carbonara = await tx.recipe.upsert({
        where: { tenantId_name: { tenantId, name: "Spaghetti alla Carbonara" } },
        update: {
          category: "Primi",
          area: "cucina",
          portions: 1,
          sellingPrice: "14.00",
          targetFcPct: "30.00",
          ivaPct: "10.00",
          overheadPct: "12.00",
          packagingCost: "0.00",
          laborCost: "1.20",
          energyCost: "0.40",
          notes: "Ricetta base carbonara",
        },
        create: {
          tenantId,
          name: "Spaghetti alla Carbonara",
          category: "Primi",
          area: "cucina",
          portions: 1,
          sellingPrice: "14.00",
          targetFcPct: "30.00",
          ivaPct: "10.00",
          overheadPct: "12.00",
          packagingCost: "0.00",
          laborCost: "1.20",
          energyCost: "0.40",
          notes: "Ricetta base carbonara",
        },
      });
      await tx.recipeIngredient.deleteMany({ where: { recipeId: carbonara.id } });
      await tx.recipeIngredient.createMany({
        data: [
          { recipeId: carbonara.id, name: "Spaghetti", qty: "0.120", unit: "kg", unitCost: "1.8000", wastePct: "0.00" },
          { recipeId: carbonara.id, name: "Guanciale", qty: "0.050", unit: "kg", unitCost: "12.5000", wastePct: "4.00" },
          { recipeId: carbonara.id, name: "Pecorino", qty: "0.020", unit: "kg", unitCost: "14.0000", wastePct: "0.00" },
        ],
      });
      await tx.recipeStep.deleteMany({ where: { recipeId: carbonara.id } });
      await tx.recipeStep.createMany({
        data: [
          { recipeId: carbonara.id, stepOrder: 1, text: "Cuoci la pasta in acqua salata." },
          { recipeId: carbonara.id, stepOrder: 2, text: "Rosola il guanciale e manteca con crema d'uovo e pecorino." },
        ],
      });
      created.recipes = 1;

      const menuExists = await tx.menuItem.findFirst({
        where: { tenantId, code: "MNU-CARBONARA" },
        select: { id: true },
      });
      if (!menuExists) {
        await tx.menuItem.create({
          data: {
            tenantId,
            name: "Spaghetti alla Carbonara",
            category: "Primi",
            area: "cucina",
            price: "14.00",
            code: "MNU-CARBONARA",
            active: true,
            recipeId: carbonara.id,
            notes: "Specialità della casa",
            foodCostPct: "29.50",
          },
        });
      }
      created.menuItems = await tx.menuItem.count({ where: { tenantId } });

      const dailyExists = await tx.dailyDish.findFirst({
        where: { tenantId, name: "Piatto del Giorno - Carbonara" },
        select: { id: true },
      });
      if (!dailyExists) {
        await tx.dailyDish.create({
          data: {
            tenantId,
            name: "Piatto del Giorno - Carbonara",
            description: "Versione premium con guanciale selezionato",
            category: "Primi",
            price: "15.00",
            allergens: "uova, latte, glutine",
            recipeId: carbonara.id,
          },
        });
      }
      created.dailyDishes = await tx.dailyDish.count({ where: { tenantId } });

      const staffRows = [
        { name: "Marta Reception", role: "Reception", email: "reception@baiaverde.local", phone: "+39 333 1010101", hireDate: new Date("2026-01-10T00:00:00Z"), salary: "1700.00", status: "attivo", hoursWeek: 40, notes: "" },
        { name: "Luca Chef", role: "Chef", email: "chef@baiaverde.local", phone: "+39 333 2020202", hireDate: new Date("2025-10-01T00:00:00Z"), salary: "2400.00", status: "attivo", hoursWeek: 44, notes: "" },
      ] as const;
      for (const staff of staffRows) {
        const exists = await tx.staffMember.findFirst({
          where: { tenantId, email: staff.email },
          select: { id: true },
        });
        if (!exists) await tx.staffMember.create({ data: { tenantId, ...staff } });
      }
      created.staffMembers = await tx.staffMember.count({ where: { tenantId } });

      const customerRows = [
        { name: "Alessio Verdi", email: "alessio.verdi@email.it", phone: "+39 333 3030303", type: "vip", visits: 3, totalSpent: "980.00", avgSpend: "326.67", allergies: "", preferences: "camera vista mare", notes: "", lastVisit: new Date("2026-04-12T00:00:00Z") },
        { name: "Chiara Neri", email: "chiara.neri@email.it", phone: "+39 333 4040404", type: "new", visits: 1, totalSpent: "240.00", avgSpend: "240.00", allergies: "lattosio", preferences: "", notes: "", lastVisit: new Date("2026-04-14T00:00:00Z") },
      ] as const;
      for (const customer of customerRows) {
        const exists = await tx.customer.findFirst({
          where: { tenantId, email: customer.email },
          select: { id: true },
        });
        if (!exists) await tx.customer.create({ data: { tenantId, ...customer } });
      }
      created.customers = await tx.customer.count({ where: { tenantId } });

      const reportDate = new Date();
      reportDate.setUTCHours(0, 0, 0, 0);
      await tx.dailyClosureReport.upsert({
        where: { tenantId_date: { tenantId, date: reportDate } },
        update: {
          foodSpend: "120.00",
          staffSpend: "260.00",
          revenue: "980.00",
          notes: "Bootstrap operatività tenant",
        },
        create: {
          tenantId,
          date: reportDate,
          foodSpend: "120.00",
          staffSpend: "260.00",
          revenue: "980.00",
          notes: "Bootstrap operatività tenant",
        },
      });
      created.reports = await tx.dailyClosureReport.count({ where: { tenantId } });
    }, {
      maxWait: 10_000,
      timeout: 30_000,
    });

    return {
      tenant,
      created,
    };
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
    const existing = await prisma.tenantEmailConfig.findUnique({ where: { tenantId } });
    const incomingPwd = typeof payload.password === "string" ? payload.password.trim() : "";
    const password = incomingPwd.length > 0 ? incomingPwd : existing?.password ?? "";
    if (!password) {
      throw new Error("SMTP password required when creating a new email configuration");
    }
    const data = {
      host: payload.host.trim(),
      port: Math.floor(Number(payload.port)),
      username: payload.username.trim(),
      password,
      fromAddress: payload.fromAddress.trim(),
      secure: !!payload.secure,
    };
    if (!Number.isFinite(data.port) || data.port <= 0 || data.port > 65535) {
      throw new Error("Invalid SMTP port");
    }
    const row = await prisma.tenantEmailConfig.upsert({
      where: { tenantId },
      update: data,
      create: { tenantId, ...data },
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
  async systemSnapshot() {
    const appVersion = process.env.APP_VERSION || process.env.NEXT_PUBLIC_APP_VERSION || "unknown";
    let dbOk = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }
    return {
      appVersion,
      processUptimeSec: Math.floor(process.uptime()),
      dbOk,
      serverTime: new Date().toISOString(),
    };
  },
};
