import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type TenantPlanForDefaults = "restaurant_only" | "hotel_only" | "all_included";

export type EnsureTenantDefaultsSummary = {
  hotelRoomsAdded: number;
  tablesAdded: number;
  recipesAdded: number;
  menuItemsAdded: number;
  dailyDishesAdded: number;
};

type Tx = Prisma.TransactionClient;

const MIN_RESTAURANT_TABLES = 10;

/** Griglia percentuale allineata a `admin.repository` / sala (left:% / top:%). */
function tableGridPositions(count: number) {
  const cols = 5;
  const leftPad = 12;
  const rightPad = 12;
  const topPad = 18;
  const rowGap = 24;
  const usableWidth = 100 - leftPad - rightPad;
  const colStep = usableWidth / (cols - 1);
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i += 1) {
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
 * Se ci sono meno di `MIN_RESTAURANT_TABLES` tavoli, crea solo quelli mancanti.
 * Non modifica tavoli esistenti; nomi `T{n}` liberi; idempotente.
 */
async function ensureMinimumRestaurantTables(tx: Tx, tenantId: string): Promise<number> {
  const total = await tx.restaurantTable.count({ where: { tenantId } });
  if (total >= MIN_RESTAURANT_TABLES) return 0;

  const needed = MIN_RESTAURANT_TABLES - total;
  const rooms = await tx.restaurantRoom.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
  });

  let roomId: string;
  if (rooms.length === 0) {
    const sala = await tx.restaurantRoom.create({
      data: { tenantId, name: "Sala 1", tables: MIN_RESTAURANT_TABLES },
    });
    roomId = sala.id;
  } else {
    let best = rooms[0]!;
    let bestCount = await tx.restaurantTable.count({ where: { tenantId, roomId: best.id } });
    for (const r of rooms.slice(1)) {
      const c = await tx.restaurantTable.count({ where: { tenantId, roomId: r.id } });
      if (c > bestCount) {
        best = r;
        bestCount = c;
      }
    }
    roomId = best.id;
  }

  const existingRows = await tx.restaurantTable.findMany({
    where: { tenantId },
    select: { nome: true },
  });
  const usedNames = new Set(existingRows.map((r) => r.nome));

  const names: string[] = [];
  let n = 1;
  while (names.length < needed) {
    const candidate = `T${n}`;
    n += 1;
    if (usedNames.has(candidate)) continue;
    usedNames.add(candidate);
    names.push(candidate);
  }

  const positions = tableGridPositions(total + needed);
  const rows = names.map((nome, j) => {
    const idx = total + j;
    const p = positions[idx] ?? positions[positions.length - 1]!;
    return {
      tenantId,
      roomId,
      nome,
      posti: 4,
      x: p.x,
      y: p.y,
      forma: idx % 2 === 0 ? ("quadrato" as const) : ("tondo" as const),
      stato: "libero" as const,
    };
  });

  await tx.restaurantTable.createMany({ data: rows });
  return needed;
}

const DEFAULT_HOTEL_CODES: readonly { code: string; floor: number; capacity: number }[] = [
  { code: "101", floor: 1, capacity: 2 },
  { code: "102", floor: 1, capacity: 2 },
  { code: "201", floor: 2, capacity: 2 },
  { code: "202", floor: 2, capacity: 2 },
  { code: "301", floor: 3, capacity: 2 },
] as const;

type IngredientSeed = { name: string; qty: string; unit: string; unitCost: string; wastePct: string };

type DishSeed = {
  name: string;
  menuCode: string;
  category: "Antipasti" | "Primi" | "Secondi";
  price: string;
  sellingPrice: string;
  allergens: string;
  ingredients: IngredientSeed[];
  step: string;
};

const HOUSE_DISHES: DishSeed[] = [
  {
    name: "Bruschette della casa",
    menuCode: "RW-HOUSE-BRUSCH",
    category: "Antipasti",
    price: "6.50",
    sellingPrice: "6.50",
    allergens: "glutine",
    ingredients: [
      { name: "Pane", qty: "0.150", unit: "kg", unitCost: "2.5000", wastePct: "5.00" },
      { name: "Pomodoro", qty: "0.120", unit: "kg", unitCost: "2.2000", wastePct: "8.00" },
      { name: "Olio EVO", qty: "0.020", unit: "L", unitCost: "12.0000", wastePct: "0.00" },
      { name: "Basilico", qty: "0.010", unit: "kg", unitCost: "18.0000", wastePct: "10.00" },
    ],
    step: "Tosta il pane, condisci con pomodoro a cubetti, olio e basilico.",
  },
  {
    name: "Caprese fresca",
    menuCode: "RW-HOUSE-CAPRESE",
    category: "Antipasti",
    price: "8.00",
    sellingPrice: "8.00",
    allergens: "latte",
    ingredients: [
      { name: "Mozzarella", qty: "0.100", unit: "kg", unitCost: "9.5000", wastePct: "2.00" },
      { name: "Pomodoro", qty: "0.120", unit: "kg", unitCost: "2.2000", wastePct: "8.00" },
      { name: "Basilico", qty: "0.008", unit: "kg", unitCost: "18.0000", wastePct: "10.00" },
      { name: "Olio EVO", qty: "0.015", unit: "L", unitCost: "12.0000", wastePct: "0.00" },
    ],
    step: "Alterna fette di mozzarella e pomodoro, completa con basilico e olio.",
  },
  {
    name: "Spaghetti al pomodoro",
    menuCode: "RW-HOUSE-SPOMP",
    category: "Primi",
    price: "9.00",
    sellingPrice: "9.00",
    allergens: "glutine",
    ingredients: [
      { name: "Spaghetti", qty: "0.100", unit: "kg", unitCost: "1.8000", wastePct: "0.00" },
      { name: "Passata di pomodoro", qty: "0.080", unit: "kg", unitCost: "2.0000", wastePct: "0.00" },
      { name: "Basilico", qty: "0.005", unit: "kg", unitCost: "18.0000", wastePct: "10.00" },
      { name: "Olio EVO", qty: "0.012", unit: "L", unitCost: "12.0000", wastePct: "0.00" },
    ],
    step: "Cuoci la pasta, condisci con passata calda, basilico e un filo d'olio.",
  },
  {
    name: "Risotto ai funghi",
    menuCode: "RW-HOUSE-RISFUN",
    category: "Primi",
    price: "12.00",
    sellingPrice: "12.00",
    allergens: "latte",
    ingredients: [
      { name: "Riso", qty: "0.090", unit: "kg", unitCost: "2.4000", wastePct: "0.00" },
      { name: "Funghi", qty: "0.060", unit: "kg", unitCost: "8.5000", wastePct: "5.00" },
      { name: "Brodo", qty: "0.250", unit: "L", unitCost: "0.8000", wastePct: "0.00" },
      { name: "Parmigiano", qty: "0.020", unit: "kg", unitCost: "16.0000", wastePct: "0.00" },
    ],
    step: "Tosta il riso, idrata con brodo caldo, manteca con funghi e parmigiano.",
  },
  {
    name: "Pollo al forno con patate",
    menuCode: "RW-HOUSE-POLLO",
    category: "Secondi",
    price: "14.00",
    sellingPrice: "14.00",
    allergens: "",
    ingredients: [
      { name: "Pollo", qty: "0.220", unit: "kg", unitCost: "6.8000", wastePct: "4.00" },
      { name: "Patate", qty: "0.180", unit: "kg", unitCost: "0.9000", wastePct: "10.00" },
      { name: "Rosmarino", qty: "0.003", unit: "kg", unitCost: "24.0000", wastePct: "0.00" },
      { name: "Olio EVO", qty: "0.018", unit: "L", unitCost: "12.0000", wastePct: "0.00" },
    ],
    step: "Disponi pollo e patate in teglia, condisci con olio e rosmarino, forna fino a cottura.",
  },
  {
    name: "Filetto di pesce del giorno",
    menuCode: "RW-HOUSE-PESCE",
    category: "Secondi",
    price: "16.00",
    sellingPrice: "16.00",
    allergens: "pesce",
    ingredients: [
      { name: "Pesce", qty: "0.180", unit: "kg", unitCost: "18.0000", wastePct: "6.00" },
      { name: "Limone", qty: "0.040", unit: "kg", unitCost: "1.2000", wastePct: "15.00" },
      { name: "Olio EVO", qty: "0.012", unit: "L", unitCost: "12.0000", wastePct: "0.00" },
      { name: "Prezzemolo", qty: "0.005", unit: "kg", unitCost: "12.0000", wastePct: "5.00" },
    ],
    step: "Cuoci il filetto in padella o al forno, servi con limone, olio e prezzemolo.",
  },
];

async function ensureHotelRatePlanClassic(tx: Tx, tenantId: string) {
  await tx.hotelRatePlan.upsert({
    where: { tenantId_code: { tenantId, code: "RP_CLASSIC_BB" } },
    update: {
      name: "Classic B&B",
      roomType: "CLASSIC",
      boardType: "bed_breakfast",
      nightlyRate: "109.00",
      refundable: true,
      active: true,
    },
    create: {
      tenantId,
      code: "RP_CLASSIC_BB",
      name: "Classic B&B",
      roomType: "CLASSIC",
      boardType: "bed_breakfast",
      nightlyRate: "109.00",
      refundable: true,
      active: true,
    },
  });
}

/**
 * Idempotente: aggiunge solo camere con codice mancante; non modifica camere già presenti.
 */
async function ensureDefaultHotelRooms(tx: Tx, tenantId: string): Promise<number> {
  await ensureHotelRatePlanClassic(tx, tenantId);
  let added = 0;
  for (const row of DEFAULT_HOTEL_CODES) {
    const existing = await tx.hotelRoom.findUnique({
      where: { tenantId_code: { tenantId, code: row.code } },
    });
    if (existing) continue;
    await tx.hotelRoom.create({
      data: {
        tenantId,
        code: row.code,
        floor: row.floor,
        roomType: "CLASSIC",
        capacity: row.capacity,
        status: "libera",
        ratePlanCode: "RP_CLASSIC_BB",
        defaultNightlyRate: "109.00",
      },
    });
    added += 1;
  }
  return added;
}

async function findRecipeByNameInsensitive(tx: Tx, tenantId: string, name: string) {
  return tx.recipe.findFirst({
    where: { tenantId, name: { equals: name, mode: "insensitive" } },
    include: { ingredients: true },
  });
}

async function findMenuItemForDish(tx: Tx, tenantId: string, dish: DishSeed) {
  return tx.menuItem.findFirst({
    where: {
      tenantId,
      OR: [{ code: dish.menuCode }, { name: { equals: dish.name, mode: "insensitive" } }],
    },
  });
}

async function findDailyByNameInsensitive(tx: Tx, tenantId: string, name: string) {
  return tx.dailyDish.findFirst({
    where: { tenantId, name: { equals: name, mode: "insensitive" } },
  });
}

async function ensureHouseMenuAndRecipes(tx: Tx, tenantId: string): Promise<{
  recipesAdded: number;
  menuItemsAdded: number;
  dailyDishesAdded: number;
}> {
  let recipesAdded = 0;
  let menuItemsAdded = 0;
  let dailyDishesAdded = 0;

  for (const dish of HOUSE_DISHES) {
    let recipe = await findRecipeByNameInsensitive(tx, tenantId, dish.name);
    if (!recipe) {
      recipe = await tx.recipe.create({
        data: {
          tenantId,
          name: dish.name,
          category: dish.category,
          area: "cucina",
          portions: 1,
          sellingPrice: dish.sellingPrice,
          targetFcPct: "30.00",
          ivaPct: "10.00",
          overheadPct: "12.00",
          packagingCost: "0.00",
          laborCost: "1.20",
          energyCost: "0.40",
          notes: "Ricetta menu della casa (bootstrap)",
          ingredients: {
            create: dish.ingredients.map((ing) => ({
              name: ing.name,
              qty: ing.qty,
              unit: ing.unit,
              unitCost: ing.unitCost,
              wastePct: ing.wastePct,
            })),
          },
          steps: {
            create: [{ stepOrder: 1, text: dish.step }],
          },
        },
        include: { ingredients: true },
      });
      recipesAdded += 1;
    }

    let menuItem = await findMenuItemForDish(tx, tenantId, dish);
    if (!menuItem) {
      await tx.menuItem.create({
        data: {
          tenantId,
          name: dish.name,
          category: dish.category,
          area: "cucina",
          price: dish.price,
          code: dish.menuCode,
          active: true,
          recipeId: recipe.id,
          notes: "Menu della casa",
          foodCostPct: null,
        },
      });
      menuItemsAdded += 1;
    } else if (menuItem.recipeId !== recipe.id) {
      await tx.menuItem.update({
        where: { id: menuItem.id },
        data: { recipeId: recipe.id },
      });
    }

    let daily = await findDailyByNameInsensitive(tx, tenantId, dish.name);
    if (!daily) {
      await tx.dailyDish.create({
        data: {
          tenantId,
          name: dish.name,
          description: "Proposta del menu della casa e del giorno.",
          category: dish.category,
          price: dish.price,
          allergens: dish.allergens,
          recipeId: recipe.id,
        },
      });
      dailyDishesAdded += 1;
    } else if (!daily.recipeId || daily.recipeId !== recipe.id) {
      await tx.dailyDish.update({
        where: { id: daily.id },
        data: { recipeId: recipe.id },
      });
    }
  }

  return { recipesAdded, menuItemsAdded, dailyDishesAdded };
}

/**
 * Dati minimi tenant-scoped, idempotente. Tavoli: solo creazione fino a 10 se mancanti (nessun update su esistenti).
 */
export async function ensureTenantDefaults(
  tx: Tx,
  tenantId: string,
  plan: TenantPlanForDefaults,
): Promise<EnsureTenantDefaultsSummary> {
  const hasRestaurant = plan === "restaurant_only" || plan === "all_included";
  const hasHotel = plan === "hotel_only" || plan === "all_included";
  let hotelRoomsAdded = 0;
  if (hasHotel) {
    hotelRoomsAdded = await ensureDefaultHotelRooms(tx, tenantId);
  }
  let tablesAdded = 0;
  if (hasRestaurant) {
    tablesAdded = await ensureMinimumRestaurantTables(tx, tenantId);
  }
  const menu = await ensureHouseMenuAndRecipes(tx, tenantId);
  return {
    hotelRoomsAdded,
    tablesAdded,
    recipesAdded: menu.recipesAdded,
    menuItemsAdded: menu.menuItemsAdded,
    dailyDishesAdded: menu.dailyDishesAdded,
  };
}

export type TenantDefaultsBackfillRow = { tenantId: string } & EnsureTenantDefaultsSummary;

/** Idempotente: esegue `ensureTenantDefaults` per ogni tenant (transazione per tenant). */
export async function backfillTenantDefaultsAllTenants(): Promise<TenantDefaultsBackfillRow[]> {
  const tenants = await prisma.tenant.findMany({ select: { id: true, plan: true } });
  const out: TenantDefaultsBackfillRow[] = [];
  for (const t of tenants) {
    const summary = await prisma.$transaction(
      async (tx) => ensureTenantDefaults(tx, t.id, t.plan as TenantPlanForDefaults),
      { maxWait: 15_000, timeout: 120_000 },
    );
    out.push({ tenantId: t.id, ...summary });
  }
  return out;
}
