import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { fileURLToPath } from "node:url";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIdx = line.indexOf("=");
    if (separatorIdx === -1) continue;
    const key = line.slice(0, separatorIdx).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = line.slice(separatorIdx + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
loadEnvFile(path.resolve(currentDir, "../.env"));
loadEnvFile(path.resolve(currentDir, "../.env.local"));

const prisma = new PrismaClient();

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "tenant_demo";
const TENANT_NAME = process.env.NEXT_PUBLIC_TENANT_NAME || "RistoSimply Demo";
const TENANT_PLAN = process.env.NEXT_PUBLIC_PRODUCT_PLAN || "all_included";
const SEED_SUPERADMIN_PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD;

if (!SEED_SUPERADMIN_PASSWORD || SEED_SUPERADMIN_PASSWORD.trim().length < 12) {
  throw new Error(
    "SEED_SUPERADMIN_PASSWORD mancante o troppo corta. Impostala in .env/.env.local con almeno 12 caratteri prima di eseguire il seed.",
  );
}

function hashPassword(plainTextPassword) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plainTextPassword, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

async function ensurePlatformConfig() {
  await prisma.platformConfig.upsert({
    where: { id: "default" },
    create: { id: "default", maintenanceMode: false },
    update: {},
  });
}

async function upsertTenant() {
  return prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {
      name: TENANT_NAME,
      slug: TENANT_ID,
      plan: TENANT_PLAN,
    },
    create: {
      id: TENANT_ID,
      name: TENANT_NAME,
      slug: TENANT_ID,
      plan: TENANT_PLAN,
    },
  });
}

async function upsertFeatures() {
  const features = [
    "restaurant",
    "hotel",
    "integration_room_charge",
    "integration_unified_folio",
    "integration_meal_plans",
  ];
  await Promise.all(
    features.map((code) =>
      prisma.tenantFeature.upsert({
        where: {
          tenantId_code: {
            tenantId: TENANT_ID,
            code,
          },
        },
        update: { enabled: true },
        create: {
          tenantId: TENANT_ID,
          code,
          enabled: true,
        },
      }),
    ),
  );
}

async function upsertUsers() {
  const users = [
    { id: "usr_superadmin", username: "superadmin", password: SEED_SUPERADMIN_PASSWORD, name: "Super Admin", email: "superadmin@ristosaas.local", role: "super_admin", mustChangePassword: true },
    { id: "usr_owner", username: "owner", password: "owner123", name: "Owner Demo", email: "owner@ristosaas.local", role: "owner", mustChangePassword: false },
    { id: "usr_sala", username: "sala", password: "sala123", name: "Marco Sala", email: "sala@ristosaas.local", role: "sala", mustChangePassword: false },
    { id: "usr_cucina", username: "cucina", password: "cucina123", name: "Chef Cucina", email: "cucina@ristosaas.local", role: "cucina", mustChangePassword: false },
    { id: "usr_cassa", username: "cassa", password: "cassa123", name: "Cassa Front", email: "cassa@ristosaas.local", role: "cassa", mustChangePassword: false },
    { id: "usr_supervisor", username: "supervisor", password: "super123", name: "Supervisor Ops", email: "supervisor@ristosaas.local", role: "supervisor", mustChangePassword: false },
    { id: "usr_magazzino", username: "magazzino", password: "magazzino123", name: "Warehouse Ops", email: "magazzino@ristosaas.local", role: "magazzino", mustChangePassword: false },
    { id: "usr_hotel", username: "hotel", password: "hotel123", name: "Hotel Manager", email: "hotel@ristosaas.local", role: "hotel_manager", mustChangePassword: false },
    { id: "usr_reception", username: "reception", password: "reception123", name: "Reception", email: "reception@ristosaas.local", role: "reception", mustChangePassword: false },
    { id: "usr_housekeeping", username: "housekeeping", password: "house123", name: "Housekeeping", email: "housekeeping@ristosaas.local", role: "housekeeping", mustChangePassword: false },
  ];
  await Promise.all(
    users.map((user) =>
      prisma.user.upsert({
        where: { id: user.id },
        update: {
          tenantId: TENANT_ID,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          passwordHash: hashPassword(user.password),
          mustChangePassword: user.mustChangePassword,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
        create: {
          id: user.id,
          tenantId: TENANT_ID,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          passwordHash: hashPassword(user.password),
          mustChangePassword: user.mustChangePassword,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
    ),
  );
}

async function upsertCustomers() {
  const customers = [
    { id: "cst_1", name: "Giovanni Rossi", email: "g.rossi@email.it", phone: "+39 333 1111111", type: "vip", visits: 14, totalSpent: 2450, avgSpend: 175, allergies: "frutta secca", preferences: "camera alta", notes: "", lastVisit: "2026-04-12" },
    { id: "cst_2", name: "Anna Bianchi", email: "anna@email.it", phone: "+39 333 2222222", type: "habitue", visits: 9, totalSpent: 980, avgSpend: 109, allergies: "", preferences: "tavolo finestra", notes: "", lastVisit: "2026-04-11" },
    { id: "cst_3", name: "Laura Moretti", email: "laura@email.it", phone: "+39 333 3333333", type: "new", visits: 1, totalSpent: 390, avgSpend: 390, allergies: "lattosio", preferences: "", notes: "", lastVisit: "2026-04-13" },
    { id: "cst_4", name: "Marco De Luca", email: "marco@email.it", phone: "+39 333 4444444", type: "walk_in", visits: 3, totalSpent: 210, avgSpend: 70, allergies: "", preferences: "", notes: "", lastVisit: "2026-04-10" },
  ];
  await Promise.all(
    customers.map((customer) =>
      prisma.customer.upsert({
        where: { id: customer.id },
        update: {
          tenantId: TENANT_ID,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          type: customer.type,
          visits: customer.visits,
          totalSpent: customer.totalSpent,
          avgSpend: customer.avgSpend,
          allergies: customer.allergies,
          preferences: customer.preferences,
          notes: customer.notes,
          lastVisit: new Date(`${customer.lastVisit}T00:00:00Z`),
        },
        create: {
          id: customer.id,
          tenantId: TENANT_ID,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          type: customer.type,
          visits: customer.visits,
          totalSpent: customer.totalSpent,
          avgSpend: customer.avgSpend,
          allergies: customer.allergies,
          preferences: customer.preferences,
          notes: customer.notes,
          lastVisit: new Date(`${customer.lastVisit}T00:00:00Z`),
        },
      }),
    ),
  );
}

async function upsertTenantLicenseAndEmailConfig() {
  await prisma.tenantLicense.upsert({
    where: { tenantId: TENANT_ID },
    update: {
      licenseKey: "RW-PRO-A1B2C3D4",
      status: "active",
      plan: TENANT_PLAN,
      billingCycle: "annual",
      seats: 25,
      usedSeats: 12,
      activatedAt: new Date("2025-06-15T00:00:00Z"),
      expiresAt: new Date("2027-06-15T00:00:00Z"),
    },
    create: {
      tenantId: TENANT_ID,
      licenseKey: "RW-PRO-A1B2C3D4",
      status: "active",
      plan: TENANT_PLAN,
      billingCycle: "annual",
      seats: 25,
      usedSeats: 12,
      activatedAt: new Date("2025-06-15T00:00:00Z"),
      expiresAt: new Date("2027-06-15T00:00:00Z"),
    },
  });

  await prisma.tenantEmailConfig.upsert({
    where: { tenantId: TENANT_ID },
    update: {
      host: "smtp.ristosaas.local",
      port: 587,
      username: "noreply@ristosaas.local",
      password: "demo_smtp_password",
      fromAddress: "RistoSimply <noreply@ristosaas.local>",
      secure: false,
      lastTestStatus: "ok",
      lastTestedAt: new Date(),
    },
    create: {
      tenantId: TENANT_ID,
      host: "smtp.ristosaas.local",
      port: 587,
      username: "noreply@ristosaas.local",
      password: "demo_smtp_password",
      fromAddress: "RistoSimply <noreply@ristosaas.local>",
      secure: false,
      lastTestStatus: "ok",
      lastTestedAt: new Date(),
    },
  });
}

async function upsertRooms() {
  const rooms = [
    { id: "hr_101", code: "101", floor: 1, capacity: 2, status: "occupata", roomType: "Classic", ratePlanCode: "RP_CLASSIC_BB" },
    { id: "hr_102", code: "102", floor: 1, capacity: 2, status: "pulita", roomType: "Classic", ratePlanCode: "RP_CLASSIC_RO" },
    { id: "hr_103", code: "103", floor: 1, capacity: 3, status: "da_pulire", roomType: "Deluxe", ratePlanCode: "RP_DELUXE_HB" },
    { id: "hr_104", code: "104", floor: 1, capacity: 4, status: "libera", roomType: "Family", ratePlanCode: "RP_FAMILY_FB" },
  ];
  await Promise.all(
    rooms.map((room) =>
      prisma.hotelRoom.upsert({
        where: { id: room.id },
        update: {
          tenantId: TENANT_ID,
          code: room.code,
          floor: room.floor,
          capacity: room.capacity,
          status: room.status,
          roomType: room.roomType,
          ratePlanCode: room.ratePlanCode,
        },
        create: {
          id: room.id,
          tenantId: TENANT_ID,
          code: room.code,
          floor: room.floor,
          capacity: room.capacity,
          status: room.status,
          roomType: room.roomType,
          ratePlanCode: room.ratePlanCode,
        },
      }),
    ),
  );
}

async function upsertHotelRatePlans() {
  const ratePlans = [
    { id: "rp_1", code: "RP_CLASSIC_RO", name: "Classic Room Only", roomType: "Classic", boardType: "room_only", nightlyRate: 90, refundable: true, active: true },
    { id: "rp_2", code: "RP_CLASSIC_BB", name: "Classic B&B", roomType: "Classic", boardType: "bed_breakfast", nightlyRate: 110, refundable: true, active: true },
    { id: "rp_3", code: "RP_DELUXE_HB", name: "Deluxe Half Board", roomType: "Deluxe", boardType: "half_board", nightlyRate: 150, refundable: false, active: true },
    { id: "rp_4", code: "RP_FAMILY_FB", name: "Family Full Board", roomType: "Family", boardType: "full_board", nightlyRate: 220, refundable: false, active: true },
    { id: "rp_5", code: "RP_SUPERIOR_BB", name: "Superior B&B", roomType: "Superior", boardType: "bed_breakfast", nightlyRate: 135, refundable: true, active: true },
  ];

  await Promise.all(
    ratePlans.map((plan) =>
      prisma.hotelRatePlan.upsert({
        where: { id: plan.id },
        update: {
          tenantId: TENANT_ID,
          code: plan.code,
          name: plan.name,
          roomType: plan.roomType,
          boardType: plan.boardType,
          nightlyRate: plan.nightlyRate,
          refundable: plan.refundable,
          active: plan.active,
        },
        create: {
          id: plan.id,
          tenantId: TENANT_ID,
          code: plan.code,
          name: plan.name,
          roomType: plan.roomType,
          boardType: plan.boardType,
          nightlyRate: plan.nightlyRate,
          refundable: plan.refundable,
          active: plan.active,
        },
      }),
    ),
  );
}

async function upsertReservations() {
  const reservations = [
    {
      id: "res_1",
      customerId: "cst_1",
      roomId: "hr_101",
      guestName: "Giovanni Rossi",
      phone: "+39 333 1111111",
      email: "g.rossi@email.it",
      checkInDate: "2026-04-12",
      checkOutDate: "2026-04-14",
      guests: 2,
      status: "in_casa",
      roomType: "Classic",
      boardType: "bed_breakfast",
      nights: 2,
      rate: 180,
      documentCode: "CI123456",
    },
    {
      id: "res_3",
      customerId: "cst_3",
      roomId: null,
      guestName: "Laura Moretti",
      phone: "+39 333 3333333",
      email: "laura@email.it",
      checkInDate: "2026-04-13",
      checkOutDate: "2026-04-16",
      guests: 2,
      status: "confermata",
      roomType: "Superior",
      boardType: "half_board",
      nights: 3,
      rate: 390,
      documentCode: "LM998877",
    },
  ];
  await Promise.all(
    reservations.map((reservation) =>
      prisma.hotelReservation.upsert({
        where: { id: reservation.id },
        update: {
          tenantId: TENANT_ID,
          customerId: reservation.customerId,
          roomId: reservation.roomId,
          guestName: reservation.guestName,
          phone: reservation.phone,
          email: reservation.email,
          checkInDate: new Date(`${reservation.checkInDate}T00:00:00Z`),
          checkOutDate: new Date(`${reservation.checkOutDate}T00:00:00Z`),
          guests: reservation.guests,
          status: reservation.status,
          roomType: reservation.roomType,
          boardType: reservation.boardType,
          nights: reservation.nights,
          rate: reservation.rate,
          documentCode: reservation.documentCode,
        },
        create: {
          id: reservation.id,
          tenantId: TENANT_ID,
          customerId: reservation.customerId,
          roomId: reservation.roomId,
          guestName: reservation.guestName,
          phone: reservation.phone,
          email: reservation.email,
          checkInDate: new Date(`${reservation.checkInDate}T00:00:00Z`),
          checkOutDate: new Date(`${reservation.checkOutDate}T00:00:00Z`),
          guests: reservation.guests,
          status: reservation.status,
          roomType: reservation.roomType,
          boardType: reservation.boardType,
          nights: reservation.nights,
          rate: reservation.rate,
          documentCode: reservation.documentCode,
        },
      }),
    ),
  );
}

async function upsertStaysAndFolio() {
  await prisma.stay.upsert({
    where: { reservationId: "res_1" },
    update: {
      tenantId: TENANT_ID,
      actualCheckInAt: new Date("2026-04-12T14:10:00Z"),
      actualCheckOutAt: null,
    },
    create: {
      id: "stay_1",
      tenantId: TENANT_ID,
      reservationId: "res_1",
      actualCheckInAt: new Date("2026-04-12T14:10:00Z"),
      actualCheckOutAt: null,
    },
  });

  await prisma.guestFolio.upsert({
    where: { id: "folio_1" },
    update: {
      tenantId: TENANT_ID,
      customerId: "cst_1",
      stayId: "stay_1",
      currency: "EUR",
      balance: 45,
      status: "open",
    },
    create: {
      id: "folio_1",
      tenantId: TENANT_ID,
      customerId: "cst_1",
      stayId: "stay_1",
      currency: "EUR",
      balance: 45,
      status: "open",
    },
  });

  await prisma.folioCharge.upsert({
    where: { id: "charge_1" },
    update: {
      folioId: "folio_1",
      source: "restaurant",
      sourceId: "ord_demo_1",
      description: "Cena ristorante addebitata in camera",
      amount: 45,
      postedAt: new Date("2026-04-12T20:30:00Z"),
    },
    create: {
      id: "charge_1",
      folioId: "folio_1",
      source: "restaurant",
      sourceId: "ord_demo_1",
      description: "Cena ristorante addebitata in camera",
      amount: 45,
      postedAt: new Date("2026-04-12T20:30:00Z"),
    },
  });
}

async function upsertKeycards() {
  await prisma.hotelKeycard.upsert({
    where: { id: "card_1" },
    update: {
      tenantId: TENANT_ID,
      roomId: "hr_101",
      reservationId: "res_1",
      validFrom: new Date("2026-04-12T14:10:00Z"),
      validUntil: new Date("2026-04-14T11:00:00Z"),
      status: "attiva",
      issuedBy: "reception",
    },
    create: {
      id: "card_1",
      tenantId: TENANT_ID,
      roomId: "hr_101",
      reservationId: "res_1",
      validFrom: new Date("2026-04-12T14:10:00Z"),
      validUntil: new Date("2026-04-14T11:00:00Z"),
      status: "attiva",
      issuedBy: "reception",
    },
  });
}

async function upsertWarehouse() {
  const items = [
    { id: "ws_1", name: "Farina 00", category: "Secchi", qty: 120, unit: "kg", minStock: 50, costPerUnit: 0.85, supplier: "Molino Rossi" },
    { id: "ws_2", name: "Mozzarella di bufala", category: "Latticini", qty: 15, unit: "kg", minStock: 10, costPerUnit: 12.5, supplier: "Caseificio Ferrara" },
    { id: "ws_3", name: "Pomodoro San Marzano", category: "Conserve", qty: 80, unit: "kg", minStock: 30, costPerUnit: 2.8, supplier: "Ortofrutticola Sud" },
    { id: "ws_4", name: "Olio EVO Puglia", category: "Condimenti", qty: 45, unit: "L", minStock: 20, costPerUnit: 8.9, supplier: "Oleificio Ferrante" },
    { id: "ws_5", name: "Vino Montepulciano", category: "Bevande", qty: 36, unit: "bt", minStock: 12, costPerUnit: 4.5, supplier: "Cantina dei Colli" },
  ];

  await Promise.all(
    items.map((item) =>
      prisma.warehouseItem.upsert({
        where: { id: item.id },
        update: {
          tenantId: TENANT_ID,
          name: item.name,
          category: item.category,
          qty: item.qty,
          unit: item.unit,
          minStock: item.minStock,
          costPerUnit: item.costPerUnit,
          supplier: item.supplier,
        },
        create: {
          id: item.id,
          tenantId: TENANT_ID,
          name: item.name,
          category: item.category,
          qty: item.qty,
          unit: item.unit,
          minStock: item.minStock,
          costPerUnit: item.costPerUnit,
          supplier: item.supplier,
        },
      }),
    ),
  );
}

async function upsertRestaurantOps() {
  const recipes = [
    {
      id: "rec_carbonara",
      name: "Spaghetti alla Carbonara",
      category: "Primi",
      area: "cucina",
      portions: 1,
      sellingPrice: 14,
      targetFcPct: 30,
      ivaPct: 10,
      overheadPct: 8,
      packagingCost: 0,
      laborCost: 1.4,
      energyCost: 0.5,
      notes: "Ricetta base carbonara",
      ingredients: [
        { name: "Pasta secca", qty: 0.12, unit: "kg", unitCost: 2.2, wastePct: 0 },
        { name: "Guanciale", qty: 0.05, unit: "kg", unitCost: 14, wastePct: 3 },
        { name: "Uova", qty: 2, unit: "pz", unitCost: 0.35, wastePct: 0 },
      ],
      steps: [
        { stepOrder: 1, text: "Cuocere la pasta in acqua salata." },
        { stepOrder: 2, text: "Rosolare il guanciale." },
        { stepOrder: 3, text: "Mantecare con uova e pecorino fuori fuoco." },
      ],
    },
    {
      id: "rec_margherita",
      name: "Pizza Margherita",
      category: "Pizze",
      area: "pizzeria",
      portions: 1,
      sellingPrice: 9,
      targetFcPct: 28,
      ivaPct: 10,
      overheadPct: 8,
      packagingCost: 0,
      laborCost: 1.2,
      energyCost: 0.7,
      notes: "Pizza classica",
      ingredients: [
        { name: "Farina 00", qty: 0.18, unit: "kg", unitCost: 0.85, wastePct: 2 },
        { name: "Mozzarella di bufala", qty: 0.12, unit: "kg", unitCost: 12.5, wastePct: 5 },
        { name: "Pomodoro San Marzano", qty: 0.08, unit: "kg", unitCost: 2.8, wastePct: 1 },
      ],
      steps: [
        { stepOrder: 1, text: "Stendere impasto e condire." },
        { stepOrder: 2, text: "Cuocere in forno a 420C." },
      ],
    },
  ];

  for (const recipe of recipes) {
    await prisma.recipe.upsert({
      where: { id: recipe.id },
      update: {
        tenantId: TENANT_ID,
        name: recipe.name,
        category: recipe.category,
        area: recipe.area,
        portions: recipe.portions,
        sellingPrice: recipe.sellingPrice,
        targetFcPct: recipe.targetFcPct,
        ivaPct: recipe.ivaPct,
        overheadPct: recipe.overheadPct,
        packagingCost: recipe.packagingCost,
        laborCost: recipe.laborCost,
        energyCost: recipe.energyCost,
        notes: recipe.notes,
      },
      create: {
        id: recipe.id,
        tenantId: TENANT_ID,
        name: recipe.name,
        category: recipe.category,
        area: recipe.area,
        portions: recipe.portions,
        sellingPrice: recipe.sellingPrice,
        targetFcPct: recipe.targetFcPct,
        ivaPct: recipe.ivaPct,
        overheadPct: recipe.overheadPct,
        packagingCost: recipe.packagingCost,
        laborCost: recipe.laborCost,
        energyCost: recipe.energyCost,
        notes: recipe.notes,
      },
    });

    await prisma.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });
    await prisma.recipeStep.deleteMany({ where: { recipeId: recipe.id } });

    await prisma.recipeIngredient.createMany({
      data: recipe.ingredients.map((ing) => ({
        recipeId: recipe.id,
        name: ing.name,
        qty: ing.qty,
        unit: ing.unit,
        unitCost: ing.unitCost,
        wastePct: ing.wastePct,
      })),
    });
    await prisma.recipeStep.createMany({
      data: recipe.steps.map((step) => ({
        recipeId: recipe.id,
        stepOrder: step.stepOrder,
        text: step.text,
      })),
    });
  }

  await prisma.menuItem.upsert({
    where: { id: "mi_carbonara" },
    update: {
      tenantId: TENANT_ID,
      name: "Spaghetti alla Carbonara",
      category: "Primi",
      area: "Cucina",
      price: 14,
      code: "PRI-001",
      active: true,
      recipeId: "rec_carbonara",
      notes: "Piatto signature",
      foodCostPct: 31,
    },
    create: {
      id: "mi_carbonara",
      tenantId: TENANT_ID,
      name: "Spaghetti alla Carbonara",
      category: "Primi",
      area: "Cucina",
      price: 14,
      code: "PRI-001",
      active: true,
      recipeId: "rec_carbonara",
      notes: "Piatto signature",
      foodCostPct: 31,
    },
  });

  await prisma.dailyDish.upsert({
    where: { id: "dd_pizza" },
    update: {
      tenantId: TENANT_ID,
      name: "Pizza Margherita",
      description: "Pomodoro, mozzarella, basilico",
      category: "Pizze",
      price: 9,
      allergens: "glutine,lattosio",
      recipeId: "rec_margherita",
    },
    create: {
      id: "dd_pizza",
      tenantId: TENANT_ID,
      name: "Pizza Margherita",
      description: "Pomodoro, mozzarella, basilico",
      category: "Pizze",
      price: 9,
      allergens: "glutine,lattosio",
      recipeId: "rec_margherita",
    },
  });

  await prisma.restaurantOrder.upsert({
    where: { id: "ord_demo_1" },
    update: {
      tenantId: TENANT_ID,
      table: "T1",
      covers: 2,
      area: "sala",
      waiter: "Sara",
      notes: "Tavolo vicino finestra",
      activeCourse: 1,
      courseStates: { "1": "in_attesa" },
      status: "in_attesa",
    },
    create: {
      id: "ord_demo_1",
      tenantId: TENANT_ID,
      table: "T1",
      covers: 2,
      area: "sala",
      waiter: "Sara",
      notes: "Tavolo vicino finestra",
      activeCourse: 1,
      courseStates: { "1": "in_attesa" },
      status: "in_attesa",
    },
  });

  await prisma.restaurantOrderItem.deleteMany({ where: { orderId: "ord_demo_1" } });
  await prisma.restaurantOrderItem.createMany({
    data: [
      {
        orderId: "ord_demo_1",
        name: "Spaghetti alla Carbonara",
        qty: 2,
        category: "Primi",
        area: "cucina",
        price: 14,
        note: null,
        course: 1,
      },
    ],
  });
}

async function upsertDailyClosureReports() {
  const reports = [
    {
      id: "dcr_2026_04_12",
      date: "2026-04-12",
      foodSpend: 320,
      staffSpend: 410,
      revenue: 1480,
      notes: "Servizio serale intenso, room charge in aumento.",
    },
    {
      id: "dcr_2026_04_13",
      date: "2026-04-13",
      foodSpend: 290,
      staffSpend: 390,
      revenue: 1320,
      notes: "Buon mix pranzo/cena.",
    },
  ];

  await Promise.all(
    reports.map((report) =>
      prisma.dailyClosureReport.upsert({
        where: { id: report.id },
        update: {
          tenantId: TENANT_ID,
          date: new Date(`${report.date}T00:00:00Z`),
          foodSpend: report.foodSpend,
          staffSpend: report.staffSpend,
          revenue: report.revenue,
          notes: report.notes,
        },
        create: {
          id: report.id,
          tenantId: TENANT_ID,
          date: new Date(`${report.date}T00:00:00Z`),
          foodSpend: report.foodSpend,
          staffSpend: report.staffSpend,
          revenue: report.revenue,
          notes: report.notes,
        },
      }),
    ),
  );
}

async function upsertOperationalModules() {
  await prisma.staffMember.upsert({
    where: { id: "stf_1" },
    update: {
      tenantId: TENANT_ID,
      name: "Marco Rossi",
      role: "Cameriere",
      email: "marco@ristosaas.it",
      phone: "+39 333 1234567",
      hireDate: new Date("2024-03-15T00:00:00Z"),
      salary: 1600,
      status: "attivo",
      hoursWeek: 40,
      notes: "",
    },
    create: {
      id: "stf_1",
      tenantId: TENANT_ID,
      name: "Marco Rossi",
      role: "Cameriere",
      email: "marco@ristosaas.it",
      phone: "+39 333 1234567",
      hireDate: new Date("2024-03-15T00:00:00Z"),
      salary: 1600,
      status: "attivo",
      hoursWeek: 40,
      notes: "",
    },
  });

  await prisma.booking.upsert({
    where: { id: "bk_1" },
    update: {
      tenantId: TENANT_ID,
      customerName: "Roberto Marchetti",
      phone: "+39 338 1111111",
      email: "roberto@email.it",
      date: new Date("2026-04-12T00:00:00Z"),
      time: "20:00",
      guests: 4,
      table: "4",
      notes: "Compleanno moglie",
      status: "confermata",
      allergies: "Glutine",
    },
    create: {
      id: "bk_1",
      tenantId: TENANT_ID,
      customerName: "Roberto Marchetti",
      phone: "+39 338 1111111",
      email: "roberto@email.it",
      date: new Date("2026-04-12T00:00:00Z"),
      time: "20:00",
      guests: 4,
      table: "4",
      notes: "Compleanno moglie",
      status: "confermata",
      allergies: "Glutine",
    },
  });

  await prisma.supplier.upsert({
    where: { id: "sup_1" },
    update: {
      tenantId: TENANT_ID,
      name: "Molino Rossi",
      category: "Secchi",
      email: "info@molinorossi.it",
      phone: "+39 02 1111111",
      address: "Via Milano 15, Milano",
      piva: "IT01234567890",
      paymentTerms: "30gg",
      rating: 5,
      notes: "Farina premium",
      active: true,
    },
    create: {
      id: "sup_1",
      tenantId: TENANT_ID,
      name: "Molino Rossi",
      category: "Secchi",
      email: "info@molinorossi.it",
      phone: "+39 02 1111111",
      address: "Via Milano 15, Milano",
      piva: "IT01234567890",
      paymentTerms: "30gg",
      rating: 5,
      notes: "Farina premium",
      active: true,
    },
  });

  await prisma.cateringEvent.upsert({
    where: { id: "cat_1" },
    update: {
      tenantId: TENANT_ID,
      name: "Matrimonio Rossi-Bianchi",
      date: new Date("2026-05-15T00:00:00Z"),
      guests: 120,
      venue: "Villa dei Cedri",
      budget: 8500,
      status: "confermato",
      contact: "Maria Rossi",
      phone: "+39 333 1112233",
      menu: "Menu degustazione 5 portate",
      notes: "Allergie: 2 celiaci, 1 lattosio",
      depositPaid: true,
    },
    create: {
      id: "cat_1",
      tenantId: TENANT_ID,
      name: "Matrimonio Rossi-Bianchi",
      date: new Date("2026-05-15T00:00:00Z"),
      guests: 120,
      venue: "Villa dei Cedri",
      budget: 8500,
      status: "confermato",
      contact: "Maria Rossi",
      phone: "+39 333 1112233",
      menu: "Menu degustazione 5 portate",
      notes: "Allergie: 2 celiaci, 1 lattosio",
      depositPaid: true,
    },
  });

  await prisma.takeawayOrder.upsert({
    where: { id: "asp_1" },
    update: {
      tenantId: TENANT_ID,
      customerName: "Marco B.",
      phone: "+39 333 1111111",
      items: [
        { name: "Margherita", qty: 2, price: 8 },
        { name: "Diavola", qty: 1, price: 10 },
      ],
      total: 26,
      status: "in_preparazione",
      pickupTime: "19:30",
      notes: "",
      type: "asporto",
      address: "",
      createdAt: new Date(),
    },
    create: {
      id: "asp_1",
      tenantId: TENANT_ID,
      customerName: "Marco B.",
      phone: "+39 333 1111111",
      items: [
        { name: "Margherita", qty: 2, price: 8 },
        { name: "Diavola", qty: 1, price: 10 },
      ],
      total: 26,
      status: "in_preparazione",
      pickupTime: "19:30",
      notes: "",
      type: "asporto",
      address: "",
      createdAt: new Date(),
    },
  });

  await prisma.archivedOrder.upsert({
    where: { id: "arc_1" },
    update: {
      tenantId: TENANT_ID,
      date: new Date("2026-04-11T00:00:00Z"),
      table: "5",
      waiter: "Marco",
      items: [
        { name: "Carbonara", qty: 2, price: 12 },
        { name: "Tagliata", qty: 1, price: 22 },
      ],
      total: 46,
      status: "completato",
      paymentMethod: "carta",
      closedAt: new Date("2026-04-11T22:15:00Z"),
    },
    create: {
      id: "arc_1",
      tenantId: TENANT_ID,
      date: new Date("2026-04-11T00:00:00Z"),
      table: "5",
      waiter: "Marco",
      items: [
        { name: "Carbonara", qty: 2, price: 12 },
        { name: "Tagliata", qty: 1, price: 22 },
      ],
      total: 46,
      status: "completato",
      paymentMethod: "carta",
      closedAt: new Date("2026-04-11T22:15:00Z"),
    },
  });
}

async function upsertRestaurantLayout() {
  await prisma.restaurantRoom.upsert({
    where: { id: "room1" },
    update: {
      tenantId: TENANT_ID,
      name: "Sala Principale",
      tables: 10,
    },
    create: {
      id: "room1",
      tenantId: TENANT_ID,
      name: "Sala Principale",
      tables: 10,
    },
  });

  const tables = [
    { id: "tbl_1", nome: "1", posti: 2, x: 8, y: 12, forma: "tondo", stato: "libero", roomId: "room1" },
    { id: "tbl_2", nome: "2", posti: 4, x: 22, y: 10, forma: "quadrato", stato: "aperto", roomId: "room1" },
    { id: "tbl_3", nome: "3", posti: 4, x: 38, y: 12, forma: "quadrato", stato: "aperto", roomId: "room1" },
    { id: "tbl_4", nome: "4", posti: 6, x: 54, y: 8, forma: "tondo", stato: "conto", roomId: "room1" },
  ];

  await Promise.all(
    tables.map((table) =>
      prisma.restaurantTable.upsert({
        where: { id: table.id },
        update: {
          tenantId: TENANT_ID,
          roomId: table.roomId,
          nome: table.nome,
          posti: table.posti,
          x: table.x,
          y: table.y,
          forma: table.forma,
          stato: table.stato,
        },
        create: {
          id: table.id,
          tenantId: TENANT_ID,
          roomId: table.roomId,
          nome: table.nome,
          posti: table.posti,
          x: table.x,
          y: table.y,
          forma: table.forma,
          stato: table.stato,
        },
      }),
    ),
  );
}

async function upsertStaffShifts() {
  await prisma.staffShift.upsert({
    where: { id: "shift_stf_1_today" },
    update: {
      tenantId: TENANT_ID,
      staffId: "stf_1",
      clockInAt: new Date(`${new Date().toISOString().slice(0, 10)}T08:00:00Z`),
      clockOutAt: new Date(`${new Date().toISOString().slice(0, 10)}T16:00:00Z`),
      notes: "Turno standard",
    },
    create: {
      id: "shift_stf_1_today",
      tenantId: TENANT_ID,
      staffId: "stf_1",
      clockInAt: new Date(`${new Date().toISOString().slice(0, 10)}T08:00:00Z`),
      clockOutAt: new Date(`${new Date().toISOString().slice(0, 10)}T16:00:00Z`),
      notes: "Turno standard",
    },
  });
}

async function main() {
  await ensurePlatformConfig();
  await upsertTenant();
  await upsertFeatures();
  await upsertTenantLicenseAndEmailConfig();
  await upsertUsers();
  await upsertCustomers();
  await upsertHotelRatePlans();
  await upsertRooms();
  await upsertReservations();
  await upsertStaysAndFolio();
  await upsertKeycards();
  await upsertWarehouse();
  await upsertRestaurantOps();
  await upsertDailyClosureReports();
  await upsertOperationalModules();
  await upsertRestaurantLayout();
  await upsertStaffShifts();
  console.log("Seed completato con successo.");
}

main()
  .catch((error) => {
    console.error("Errore seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
