import { prisma } from "@/lib/db/prisma";

type KitchenTopDish = {
  name: string;
  qty: number;
  revenue: number;
};

type KitchenFeasibleDish = {
  menuItem: string;
  recipeName: string;
  possiblePortions: number;
  missingIngredients: string[];
};

export type KitchenAiSnapshot = {
  periodDays: number;
  generatedAt: string;
  topDishes: KitchenTopDish[];
  lowStockItems: Array<{ name: string; qty: number; minStock: number; unit: string }>;
  overStockItems: Array<{ name: string; qty: number; minStock: number; unit: string }>;
  feasibleDishes: KitchenFeasibleDish[];
};

export type FoodCostInsight = {
  menuItemId: string;
  menuItem: string;
  recipeId: string;
  recipeName: string;
  price: number;
  plateCost: number;
  marginValue: number;
  marginPct: number;
  actualFoodCostPct: number;
  targetFoodCostPct: number;
  suggestedPrice: number;
  status: "healthy" | "low_margin" | "loss";
  demandQty: number;
  note: string;
};

export type WarehouseOperationalInsight = {
  stagnantProducts: Array<{
    warehouseItemId: string;
    name: string;
    qty: number;
    unit: string;
    daysWithoutMovement: number;
    suggestion: string;
  }>;
  expiringProducts: Array<{
    lotId: string;
    warehouseItemId: string;
    name: string;
    qtyRemaining: number;
    unit: string;
    expiresAt: string;
    daysToExpire: number;
    suggestion: string;
  }>;
};

export type GeneratedMenuInsight = {
  dailyMenu: Array<{
    menuItemId: string;
    name: string;
    category: string;
    score: number;
    reason: string;
  }>;
  seasonalMenu: Array<{
    menuItemId: string;
    name: string;
    category: string;
    score: number;
    reason: string;
  }>;
};

export type PricingInsight = Array<{
  menuItemId: string;
  menuItem: string;
  currentPrice: number;
  suggestedPrice: number;
  deltaPct: number;
  reason: string;
}>;

export type ManagerReportInsight = {
  estimatedRevenue: number;
  averageMarginPct: number;
  estimatedWasteValue: number;
  topDishes: KitchenTopDish[];
  dishesToRemove: Array<{ menuItem: string; demandQty: number; marginPct: number; reason: string }>;
  dailyLossEstimate: number;
  headline: string;
};

export type ReorderInsight = Array<{
  warehouseItemId: string;
  name: string;
  qty: number;
  unit: string;
  minStock: number;
  avgDailyConsumption: number;
  suggestedOrderQty: number;
  eta: string;
  reason: string;
}>;

export type HotelBridgeInsight = {
  breakfastCoversTomorrow: number;
  halfBoardGuestsTomorrow: number;
  fullBoardGuestsTomorrow: number;
  notes: string[];
};

export type KitchenOperationalSnapshot = {
  periodDays: number;
  generatedAt: string;
  foodCost: FoodCostInsight[];
  warehouse: WarehouseOperationalInsight;
  menuGenerator: GeneratedMenuInsight;
  dynamicPricing: PricingInsight;
  managerReport: ManagerReportInsight;
  reorder: ReorderInsight;
  hotelBridge: HotelBridgeInsight;
  kpi: {
    lowMarginDishes: number;
    lossDishes: number;
    expiringLots: number;
    stagnantProducts: number;
  };
};

type ProposalDraftType =
  | "food_cost"
  | "warehouse"
  | "menu"
  | "pricing"
  | "manager_report"
  | "reorder"
  | "hotel_bridge";

export type KitchenProposalDraft = {
  type: ProposalDraftType;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function dayStartUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export const aiKitchenRepository = {
  async snapshot(tenantId: string, periodDays = 14): Promise<KitchenAiSnapshot> {
    const operational = await this.operationalSnapshot(tenantId, periodDays);
    const topDishes = operational.managerReport.topDishes;
    const lowStockItems = operational.reorder
      .filter((item) => item.qty <= item.minStock)
      .map((item) => ({
        name: item.name,
        qty: item.qty,
        minStock: item.minStock,
        unit: item.unit,
      }));
    const overStockItems = operational.reorder
      .filter((item) => item.qty >= item.minStock * 2)
      .slice(0, 10)
      .map((item) => ({
        name: item.name,
        qty: item.qty,
        minStock: item.minStock,
        unit: item.unit,
      }));
    const feasibleDishes = operational.menuGenerator.dailyMenu.map((dish) => ({
      menuItem: dish.name,
      recipeName: dish.name,
      possiblePortions: Math.max(0, Math.round(dish.score)),
      missingIngredients: [],
    }));

    return {
      periodDays: operational.periodDays,
      generatedAt: operational.generatedAt,
      topDishes,
      lowStockItems,
      overStockItems,
      feasibleDishes,
    };
  },
  async operationalSnapshot(tenantId: string, periodDays = 14): Promise<KitchenOperationalSnapshot> {
    const now = new Date();
    const from = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const reorderFrom = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const movementWindowStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const tomorrowStart = dayStartUtc(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    const [orders, stock, menuItems, lots, costHistoryRows, movementRows, reservationsTomorrow] =
      await Promise.all([
        prisma.restaurantOrder.findMany({
          where: {
            tenantId,
            createdAt: { gte: from, lte: now },
          },
          include: { items: true },
        }),
        prisma.warehouseItem.findMany({
          where: { tenantId },
          orderBy: { name: "asc" },
        }),
        prisma.menuItem.findMany({
          where: { tenantId, active: true, recipeId: { not: null } },
          include: {
            recipe: {
              include: { ingredients: true },
            },
          },
          orderBy: { name: "asc" },
        }),
        prisma.warehouseLot.findMany({
          where: { tenantId, qtyRemaining: { gt: 0 } },
          include: { item: { select: { name: true, unit: true } } },
        }),
        prisma.warehouseCostHistory.findMany({
          where: { tenantId },
          orderBy: [{ warehouseItemId: "asc" }, { effectiveAt: "desc" }],
        }),
        prisma.warehouseMovement.findMany({
          where: {
            tenantId,
            date: { gte: movementWindowStart, lte: now },
          },
          orderBy: [{ warehouseItemId: "asc" }, { date: "desc" }],
        }),
        prisma.hotelReservation.findMany({
          where: {
            tenantId,
            status: { in: ["confermata", "in_casa"] },
            checkInDate: { lte: tomorrowEnd },
            checkOutDate: { gt: tomorrowStart },
          },
          select: {
            guests: true,
            boardType: true,
          },
        }),
      ]);

    const dishMap = new Map<string, { qty: number; revenue: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const key = item.name;
        const current = dishMap.get(key) ?? { qty: 0, revenue: 0 };
        const lineRevenue = (item.price?.toNumber() ?? 0) * item.qty;
        dishMap.set(key, {
          qty: current.qty + item.qty,
          revenue: current.revenue + lineRevenue,
        });
      }
    }

    const topDishes: KitchenTopDish[] = [...dishMap.entries()]
      .map(([name, metrics]) => ({ name, qty: metrics.qty, revenue: Number(metrics.revenue.toFixed(2)) }))
      .sort((a, b) => (b.qty !== a.qty ? b.qty - a.qty : b.revenue - a.revenue))
      .slice(0, 10);

    const latestCostByItemId = new Map<string, number>();
    for (const row of costHistoryRows) {
      if (!latestCostByItemId.has(row.warehouseItemId)) {
        latestCostByItemId.set(row.warehouseItemId, row.unitCost.toNumber());
      }
    }

    const stockMap = new Map(
      stock.map((item) => [
        normalizeKey(item.name),
        {
          id: item.id,
          name: item.name,
          qty: item.qty.toNumber(),
          minStock: item.minStock.toNumber(),
          costPerUnit: item.costPerUnit.toNumber(),
          unit: item.unit,
        },
      ]),
    );
    const stockById = new Map(
      stock.map((item) => [
        item.id,
        {
          id: item.id,
          name: item.name,
          qty: item.qty.toNumber(),
          minStock: item.minStock.toNumber(),
          costPerUnit: item.costPerUnit.toNumber(),
          unit: item.unit,
        },
      ]),
    );

    const feasibleDishes: Array<KitchenFeasibleDish & { menuItemId: string; category: string }> = [];
    const foodCost: FoodCostInsight[] = [];
    for (const menu of menuItems) {
      const recipe = menu.recipe;
      if (!recipe) continue;

      let possiblePortions = Number.POSITIVE_INFINITY;
      const missingIngredients: string[] = [];
      let ingredientCost = 0;

      for (const ingredient of recipe.ingredients) {
        const requiredQty = ingredient.qty.toNumber() * (1 + ingredient.wastePct.toNumber() / 100);
        const stockItem =
          (ingredient.warehouseItemId ? stockById.get(ingredient.warehouseItemId) : null) ??
          stockMap.get(normalizeKey(ingredient.name));
        if (!stockItem || stockItem.qty <= 0 || requiredQty <= 0) {
          missingIngredients.push(ingredient.name);
          possiblePortions = 0;
          continue;
        }
        const latestUnitCost = latestCostByItemId.get(stockItem.id) ?? stockItem.costPerUnit;
        ingredientCost += requiredQty * latestUnitCost;
        const ingredientPortions = Math.floor(stockItem.qty / requiredQty);
        if (ingredientPortions < possiblePortions) possiblePortions = ingredientPortions;
      }

      const productionCost =
        ingredientCost +
        recipe.packagingCost.toNumber() +
        recipe.laborCost.toNumber() +
        recipe.energyCost.toNumber();
      const portions = Math.max(1, recipe.portions);
      const plateCost = productionCost / portions;
      const price = menu.price.toNumber();
      const marginValue = price - plateCost;
      const marginPct = price > 0 ? (marginValue / price) * 100 : 0;
      const actualFoodCostPct = price > 0 ? (plateCost / price) * 100 : 0;
      const targetFoodCostPct = recipe.targetFcPct.toNumber();
      const suggestedPrice =
        targetFoodCostPct > 0 ? plateCost / Math.max(0.05, targetFoodCostPct / 100) : price;
      const demandQty = dishMap.get(menu.name)?.qty ?? 0;
      const status: FoodCostInsight["status"] =
        marginValue < 0 ? "loss" : marginPct < 20 ? "low_margin" : "healthy";
      const note =
        status === "loss"
          ? `${menu.name} -> costo ${round(plateCost).toFixed(2)} EUR, prezzo ${price.toFixed(2)} EUR, piatto in perdita`
          : status === "low_margin"
            ? `${menu.name} -> costo ${round(plateCost).toFixed(2)} EUR, prezzo ${price.toFixed(2)} EUR, margine basso`
            : `${menu.name} -> margine in controllo`;

      foodCost.push({
        menuItemId: menu.id,
        menuItem: menu.name,
        recipeId: recipe.id,
        recipeName: recipe.name,
        price: round(price),
        plateCost: round(plateCost),
        marginValue: round(marginValue),
        marginPct: round(marginPct),
        actualFoodCostPct: round(actualFoodCostPct),
        targetFoodCostPct: round(targetFoodCostPct),
        suggestedPrice: round(suggestedPrice),
        status,
        demandQty,
        note,
      });
      feasibleDishes.push({
        menuItemId: menu.id,
        menuItem: menu.name,
        recipeName: recipe.name,
        category: menu.category,
        possiblePortions: Number.isFinite(possiblePortions) ? Math.max(0, possiblePortions) : 0,
        missingIngredients,
      });
    }

    feasibleDishes.sort((a, b) => b.possiblePortions - a.possiblePortions);
    foodCost.sort((a, b) => {
      if (a.status !== b.status) {
        const rank = { loss: 0, low_margin: 1, healthy: 2 } as const;
        return rank[a.status] - rank[b.status];
      }
      return b.demandQty - a.demandQty;
    });

    const movementsByItem = new Map<
      string,
      { lastDate: Date | null; consumedQty14: number }
    >();
    for (const item of stock) {
      movementsByItem.set(item.id, { lastDate: null, consumedQty14: 0 });
    }
    for (const movement of movementRows) {
      const current = movementsByItem.get(movement.warehouseItemId) ?? { lastDate: null, consumedQty14: 0 };
      if (!current.lastDate || movement.date > current.lastDate) current.lastDate = movement.date;
      if (
        movement.date >= reorderFrom &&
        (movement.type === "scarico" || movement.type === "scarico_comanda")
      ) {
        current.consumedQty14 += movement.qty.toNumber();
      }
      movementsByItem.set(movement.warehouseItemId, current);
    }

    const stagnantProducts = stock
      .map((item) => {
        const movement = movementsByItem.get(item.id);
        const daysWithoutMovement =
          !movement?.lastDate
            ? 999
            : Math.max(
                0,
                Math.floor((now.getTime() - movement.lastDate.getTime()) / (24 * 60 * 60 * 1000)),
              );
        return {
          warehouseItemId: item.id,
          name: item.name,
          qty: item.qty.toNumber(),
          unit: item.unit,
          daysWithoutMovement,
          suggestion:
            daysWithoutMovement >= 10 && item.qty.toNumber() > 0
              ? `${item.name}: prodotto fermo da ${daysWithoutMovement} giorni, attiva promo o uso immediato`
              : `${item.name}: rotazione regolare`,
        };
      })
      .filter((item) => item.qty > 0 && item.daysWithoutMovement >= 10)
      .sort((a, b) => b.daysWithoutMovement - a.daysWithoutMovement)
      .slice(0, 12);

    const expiringProducts = lots
      .map((lot) => {
        const daysToExpire =
          lot.expiresAt == null
            ? 999
            : Math.floor((lot.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        return {
          lotId: lot.id,
          warehouseItemId: lot.warehouseItemId,
          name: lot.item.name,
          qtyRemaining: lot.qtyRemaining.toNumber(),
          unit: lot.item.unit,
          expiresAt: lot.expiresAt ? lot.expiresAt.toISOString() : "",
          daysToExpire,
          suggestion:
            daysToExpire <= 0
              ? `${lot.item.name}: elimina o verifica subito`
              : daysToExpire <= 2
                ? `${lot.item.name}: usa entro ${Math.max(1, daysToExpire)} giorni`
                : `${lot.item.name}: disponibile`,
        };
      })
      .filter((lot) => lot.daysToExpire <= 7)
      .sort((a, b) => a.daysToExpire - b.daysToExpire)
      .slice(0, 12);

    const expiringNames = new Set(expiringProducts.map((item) => normalizeKey(item.name)));
    const menuScored = feasibleDishes
      .map((dish) => {
        const pricing = foodCost.find((f) => f.menuItemId === dish.menuItemId);
        const expiringBoost = expiringNames.has(normalizeKey(dish.menuItem)) ? 5 : 0;
        const demand = dishMap.get(dish.menuItem)?.qty ?? 0;
        const marginBoost = pricing ? Math.max(0, pricing.marginPct / 10) : 0;
        const score = round(dish.possiblePortions * 0.8 + demand * 1.2 + expiringBoost + marginBoost, 3);
        return {
          menuItemId: dish.menuItemId,
          name: dish.menuItem,
          category: dish.category,
          score,
          demand,
          marginPct: pricing?.marginPct ?? 0,
          reason:
            expiringBoost > 0
              ? `Smaltimento stock in scadenza + domanda ${demand}`
              : `Fattibilita ${dish.possiblePortions} porzioni + domanda ${demand}`,
        };
      })
      .sort((a, b) => b.score - a.score);

    const dailyMenu = menuScored.slice(0, 8).map((dish) => ({
      menuItemId: dish.menuItemId,
      name: dish.name,
      category: dish.category,
      score: dish.score,
      reason: dish.reason,
    }));
    const seasonalMenu = menuScored
      .slice()
      .sort((a, b) => b.marginPct - a.marginPct || b.score - a.score)
      .slice(0, 12)
      .map((dish) => ({
        menuItemId: dish.menuItemId,
        name: dish.name,
        category: dish.category,
        score: dish.score,
        reason: `Margine ${dish.marginPct.toFixed(1)}% + domanda ${dish.demand}`,
      }));

    const dynamicPricing: PricingInsight = foodCost
      .map((dish) => {
        const currentPrice = dish.price;
        const raiseForMargin = dish.status !== "healthy" ? dish.suggestedPrice : currentPrice;
        const demandFactor = dish.demandQty >= 20 ? 1.04 : 1;
        const suggestedPrice = round(Math.max(currentPrice, raiseForMargin) * demandFactor);
        const deltaPct = currentPrice > 0 ? ((suggestedPrice - currentPrice) / currentPrice) * 100 : 0;
        if (deltaPct < 3 && dish.status === "healthy") return null;
        const reason =
          dish.status === "loss"
            ? `Piatto in perdita: proponi aumento prezzo del ${round(deltaPct, 1)}%`
            : dish.status === "low_margin"
              ? `Margine basso: suggerito adeguamento del ${round(deltaPct, 1)}%`
              : `Domanda alta (${dish.demandQty} ordini): possibile aumento controllato`;
        return {
          menuItemId: dish.menuItemId,
          menuItem: dish.menuItem,
          currentPrice: dish.price,
          suggestedPrice,
          deltaPct: round(deltaPct, 1),
          reason,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null)
      .slice(0, 12);

    const reorder: ReorderInsight = stock
      .map((item) => {
        const movement = movementsByItem.get(item.id);
        const avgDailyConsumption = movement ? movement.consumedQty14 / 14 : 0;
        const qty = item.qty.toNumber();
        const minStock = item.minStock.toNumber();
        const targetQty = Math.max(minStock * 2, avgDailyConsumption * 5);
        const suggestedOrderQty = Math.max(0, round(targetQty - qty, 3));
        if (suggestedOrderQty <= 0.001 && qty > minStock) return null;
        const eta = suggestedOrderQty > 0 ? "entro domani" : "monitorare";
        const reason =
          qty <= minStock
            ? `Sotto soglia minima (${qty} ${item.unit} <= ${minStock} ${item.unit})`
            : `Consumo medio ${round(avgDailyConsumption, 3)} ${item.unit}/giorno`;
        return {
          warehouseItemId: item.id,
          name: item.name,
          qty: round(qty, 3),
          unit: item.unit,
          minStock: round(minStock, 3),
          avgDailyConsumption: round(avgDailyConsumption, 3),
          suggestedOrderQty,
          eta,
          reason,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null)
      .sort((a, b) => b.suggestedOrderQty - a.suggestedOrderQty)
      .slice(0, 12);

    const totalRevenue = [...dishMap.values()].reduce((sum, row) => sum + row.revenue, 0);
    const totalQty = [...dishMap.values()].reduce((sum, row) => sum + row.qty, 0);
    const estimatedRevenue = round(totalRevenue / Math.max(1, periodDays));
    const weightedMargin = foodCost.reduce((sum, dish) => sum + dish.marginPct * Math.max(1, dish.demandQty), 0);
    const weightedUnits = foodCost.reduce((sum, dish) => sum + Math.max(1, dish.demandQty), 0);
    const averageMarginPct = weightedUnits > 0 ? round(weightedMargin / weightedUnits) : 0;
    const estimatedWasteValue = round(
      expiringProducts.reduce((sum, lot) => {
        const unitCost =
          latestCostByItemId.get(lot.warehouseItemId) ??
          stockById.get(lot.warehouseItemId)?.costPerUnit ??
          0;
        return sum + lot.qtyRemaining * unitCost;
      }, 0),
    );
    const dishesToRemove = foodCost
      .filter((dish) => dish.demandQty <= 1 && dish.marginPct < 12)
      .slice(0, 8)
      .map((dish) => ({
        menuItem: dish.menuItem,
        demandQty: dish.demandQty,
        marginPct: round(dish.marginPct),
        reason: "Bassa domanda e margine insufficiente",
      }));
    const dailyLossEstimate = round(
      foodCost
        .filter((dish) => dish.marginValue < 0)
        .reduce((sum, dish) => sum + Math.abs(dish.marginValue) * (dish.demandQty / Math.max(1, periodDays)), 0),
    );
    const headline =
      dailyLossEstimate > 0
        ? `Stai perdendo circa ${dailyLossEstimate.toFixed(2)} EUR/giorno sui piatti critici`
        : `Margine medio ${averageMarginPct.toFixed(1)}% con ${totalQty} porzioni vendute`;

    const breakfastCoversTomorrow = reservationsTomorrow
      .filter((reservation) => reservation.boardType !== "room_only")
      .reduce((sum, reservation) => sum + reservation.guests, 0);
    const halfBoardGuestsTomorrow = reservationsTomorrow
      .filter((reservation) => reservation.boardType === "half_board")
      .reduce((sum, reservation) => sum + reservation.guests, 0);
    const fullBoardGuestsTomorrow = reservationsTomorrow
      .filter((reservation) => reservation.boardType === "full_board")
      .reduce((sum, reservation) => sum + reservation.guests, 0);

    return {
      periodDays,
      generatedAt: now.toISOString(),
      foodCost: foodCost.slice(0, 24),
      warehouse: {
        stagnantProducts,
        expiringProducts,
      },
      menuGenerator: {
        dailyMenu,
        seasonalMenu,
      },
      dynamicPricing,
      managerReport: {
        estimatedRevenue,
        averageMarginPct,
        estimatedWasteValue,
        topDishes,
        dishesToRemove,
        dailyLossEstimate,
        headline,
      },
      reorder,
      hotelBridge: {
        breakfastCoversTomorrow,
        halfBoardGuestsTomorrow,
        fullBoardGuestsTomorrow,
        notes: [
          `Colazioni stimate domani: ${breakfastCoversTomorrow}`,
          `Ospiti mezza pensione: ${halfBoardGuestsTomorrow}`,
          `Ospiti pensione completa: ${fullBoardGuestsTomorrow}`,
        ],
      },
      kpi: {
        lowMarginDishes: foodCost.filter((dish) => dish.status === "low_margin").length,
        lossDishes: foodCost.filter((dish) => dish.status === "loss").length,
        expiringLots: expiringProducts.length,
        stagnantProducts: stagnantProducts.length,
      },
    };
  },
  buildProposalDrafts(snapshot: KitchenOperationalSnapshot): KitchenProposalDraft[] {
    const lowOrLoss = snapshot.foodCost.filter(
      (dish) => dish.status === "loss" || dish.status === "low_margin",
    );
    const foodCostSummary =
      lowOrLoss.length > 0
        ? lowOrLoss.slice(0, 6).map((dish) => dish.note).join("; ")
        : "Nessun piatto critico rilevato";

    const warehouseLines: string[] = [];
    for (const stale of snapshot.warehouse.stagnantProducts.slice(0, 4)) {
      warehouseLines.push(
        `${stale.name}: ${stale.qty} ${stale.unit} fermi da ${stale.daysWithoutMovement} giorni`,
      );
    }
    for (const expiring of snapshot.warehouse.expiringProducts.slice(0, 4)) {
      warehouseLines.push(
        `${expiring.name}: ${expiring.qtyRemaining} ${expiring.unit} in scadenza (${expiring.daysToExpire} giorni)`,
      );
    }

    const menuSummary =
      snapshot.menuGenerator.dailyMenu.length > 0
        ? snapshot.menuGenerator.dailyMenu
            .slice(0, 5)
            .map((dish) => `${dish.name} (${dish.reason})`)
            .join("; ")
        : "Nessuna proposta menu disponibile";
    const pricingSummary =
      snapshot.dynamicPricing.length > 0
        ? snapshot.dynamicPricing
            .slice(0, 5)
            .map(
              (dish) =>
                `${dish.menuItem}: ${dish.currentPrice.toFixed(2)} -> ${dish.suggestedPrice.toFixed(2)} EUR`,
            )
            .join("; ")
        : "Nessun adeguamento prezzo consigliato";
    const reorderSummary =
      snapshot.reorder.length > 0
        ? snapshot.reorder
            .slice(0, 5)
            .map((item) => `${item.name}: ordina ${item.suggestedOrderQty} ${item.unit} ${item.eta}`)
            .join("; ")
        : "Nessun riordino urgente";

    return [
      {
        type: "food_cost",
        title: "Food cost automatico",
        summary: foodCostSummary,
        payload: {
          generatedAt: snapshot.generatedAt,
          criticalDishes: lowOrLoss.slice(0, 10),
        },
      },
      {
        type: "warehouse",
        title: "Magazzino intelligente",
        summary: warehouseLines.length > 0 ? warehouseLines.join("; ") : "Nessuna anomalia magazzino rilevata",
        payload: {
          generatedAt: snapshot.generatedAt,
          stagnantProducts: snapshot.warehouse.stagnantProducts,
          expiringProducts: snapshot.warehouse.expiringProducts,
        },
      },
      {
        type: "menu",
        title: "Generatore menu automatico",
        summary: menuSummary,
        payload: {
          generatedAt: snapshot.generatedAt,
          dailyMenu: snapshot.menuGenerator.dailyMenu,
          seasonalMenu: snapshot.menuGenerator.seasonalMenu,
        },
      },
      {
        type: "pricing",
        title: "Pricing dinamico",
        summary: pricingSummary,
        payload: {
          generatedAt: snapshot.generatedAt,
          suggestions: snapshot.dynamicPricing,
        },
      },
      {
        type: "manager_report",
        title: "Report manager giornaliero",
        summary: snapshot.managerReport.headline,
        payload: {
          generatedAt: snapshot.generatedAt,
          report: snapshot.managerReport,
        },
      },
      {
        type: "reorder",
        title: "Riordino automatico",
        summary: reorderSummary,
        payload: {
          generatedAt: snapshot.generatedAt,
          suggestions: snapshot.reorder,
        },
      },
      {
        type: "hotel_bridge",
        title: "AI operativa hotel bridge",
        summary: snapshot.hotelBridge.notes.join("; "),
        payload: {
          generatedAt: snapshot.generatedAt,
          bridge: snapshot.hotelBridge,
        },
      },
    ];
  },
};
