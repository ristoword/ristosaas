import { prisma } from "@/lib/db/prisma";
import { calcFoodCost, type DailyDish, type MenuItem, type Recipe } from "@/lib/api/types/kitchen";

type RecipeArea = Recipe["area"];

function toRecipeArea(value: string): RecipeArea {
  if (value === "cucina" || value === "bar" || value === "pizzeria") return value;
  return "cucina";
}

function mapRecipe(row: {
  id: string;
  name: string;
  category: string;
  area: string;
  portions: number;
  sellingPrice: { toNumber: () => number };
  targetFcPct: { toNumber: () => number };
  ivaPct: { toNumber: () => number };
  overheadPct: { toNumber: () => number };
  packagingCost: { toNumber: () => number };
  laborCost: { toNumber: () => number };
  energyCost: { toNumber: () => number };
  notes: string;
  createdAt: Date;
  ingredients: Array<{
    id: string;
    name: string;
    qty: { toNumber: () => number };
    unit: string;
    unitCost: { toNumber: () => number };
    wastePct: { toNumber: () => number };
  }>;
  steps: Array<{
    id: string;
    stepOrder: number;
    text: string;
  }>;
}): Recipe {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    area: toRecipeArea(row.area),
    portions: row.portions,
    sellingPrice: row.sellingPrice.toNumber(),
    targetFcPct: row.targetFcPct.toNumber(),
    ivaPct: row.ivaPct.toNumber(),
    overheadPct: row.overheadPct.toNumber(),
    packagingCost: row.packagingCost.toNumber(),
    laborCost: row.laborCost.toNumber(),
    energyCost: row.energyCost.toNumber(),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    ingredients: row.ingredients.map((ing) => ({
      id: ing.id,
      name: ing.name,
      qty: ing.qty.toNumber(),
      unit: ing.unit,
      unitCost: ing.unitCost.toNumber(),
      wastePct: ing.wastePct.toNumber(),
    })),
    steps: row.steps
      .slice()
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map((step) => ({
        id: step.id,
        order: step.stepOrder,
        text: step.text,
      })),
  };
}

function mapMenuItem(row: {
  id: string;
  name: string;
  category: string;
  area: string;
  price: { toNumber: () => number };
  code: string;
  active: boolean;
  recipeId: string | null;
  notes: string;
  foodCostPct: { toNumber: () => number } | null;
}): MenuItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    area: row.area,
    price: row.price.toNumber(),
    code: row.code,
    active: row.active,
    recipeId: row.recipeId,
    notes: row.notes,
    foodCostPct: row.foodCostPct ? row.foodCostPct.toNumber() : null,
  };
}

function mapDailyDish(row: {
  id: string;
  name: string;
  description: string;
  category: string;
  price: { toNumber: () => number };
  allergens: string;
  recipeId: string | null;
}): DailyDish {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    price: row.price.toNumber(),
    allergens: row.allergens,
    recipeId: row.recipeId,
  };
}

export const kitchenMenuRepository = {
  async allRecipes(tenantId: string) {
    const rows = await prisma.recipe.findMany({
      where: { tenantId },
      include: {
        ingredients: true,
        steps: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapRecipe);
  },
  async getRecipe(tenantId: string, id: string) {
    const row = await prisma.recipe.findFirst({
      where: { tenantId, id },
      include: { ingredients: true, steps: true },
    });
    return row ? mapRecipe(row) : null;
  },
  async findRecipeByName(tenantId: string, name: string) {
    const row = await prisma.recipe.findFirst({
      where: {
        tenantId,
        name: { equals: name, mode: "insensitive" },
      },
      include: { ingredients: true, steps: true },
    });
    return row ? mapRecipe(row) : null;
  },
  async createRecipe(tenantId: string, data: Omit<Recipe, "id" | "createdAt">) {
    const row = await prisma.recipe.create({
      data: {
        tenantId,
        name: data.name,
        category: data.category,
        area: data.area,
        portions: data.portions,
        sellingPrice: data.sellingPrice,
        targetFcPct: data.targetFcPct,
        ivaPct: data.ivaPct,
        overheadPct: data.overheadPct,
        packagingCost: data.packagingCost,
        laborCost: data.laborCost,
        energyCost: data.energyCost,
        notes: data.notes,
        ingredients: {
          create: data.ingredients.map((ing) => ({
            name: ing.name,
            qty: ing.qty,
            unit: ing.unit,
            unitCost: ing.unitCost,
            wastePct: ing.wastePct,
          })),
        },
        steps: {
          create: data.steps.map((step) => ({
            stepOrder: step.order,
            text: step.text,
          })),
        },
      },
      include: { ingredients: true, steps: true },
    });
    return mapRecipe(row);
  },
  async updateRecipe(tenantId: string, id: string, updates: Partial<Recipe>) {
    const existing = await prisma.recipe.findFirst({
      where: { tenantId, id },
      include: { ingredients: true, steps: true },
    });
    if (!existing) return null;

    const row = await prisma.recipe.update({
      where: { id },
      data: {
        name: updates.name,
        category: updates.category,
        area: updates.area,
        portions: updates.portions,
        sellingPrice: updates.sellingPrice,
        targetFcPct: updates.targetFcPct,
        ivaPct: updates.ivaPct,
        overheadPct: updates.overheadPct,
        packagingCost: updates.packagingCost,
        laborCost: updates.laborCost,
        energyCost: updates.energyCost,
        notes: updates.notes,
        ingredients: updates.ingredients
          ? {
              deleteMany: {},
              create: updates.ingredients.map((ing) => ({
                name: ing.name,
                qty: ing.qty,
                unit: ing.unit,
                unitCost: ing.unitCost,
                wastePct: ing.wastePct,
              })),
            }
          : undefined,
        steps: updates.steps
          ? {
              deleteMany: {},
              create: updates.steps.map((step) => ({
                stepOrder: step.order,
                text: step.text,
              })),
            }
          : undefined,
      },
      include: { ingredients: true, steps: true },
    });
    return mapRecipe(row);
  },
  async deleteRecipe(tenantId: string, id: string) {
    const existing = await prisma.recipe.findFirst({ where: { tenantId, id } });
    if (!existing) return false;
    await prisma.recipe.delete({ where: { id } });
    return true;
  },
  async allMenuItems(tenantId: string) {
    const rows = await prisma.menuItem.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
    return rows.map(mapMenuItem);
  },
  async getMenuItem(tenantId: string, id: string) {
    const row = await prisma.menuItem.findFirst({ where: { tenantId, id } });
    return row ? mapMenuItem(row) : null;
  },
  async createMenuItem(tenantId: string, payload: {
    name: string;
    category: string;
    area: string;
    price: number;
    code: string;
    active: boolean;
    recipeId: string | null;
    notes: string;
    foodCostPct: number | null;
  }) {
    const row = await prisma.menuItem.create({
      data: {
        tenantId,
        ...payload,
      },
    });
    return mapMenuItem(row);
  },
  async updateMenuItem(tenantId: string, id: string, updates: Partial<MenuItem>) {
    const existing = await prisma.menuItem.findFirst({ where: { tenantId, id } });
    if (!existing) return null;
    const row = await prisma.menuItem.update({
      where: { id },
      data: {
        name: updates.name,
        category: updates.category,
        area: updates.area,
        price: updates.price,
        code: updates.code,
        active: updates.active,
        recipeId: updates.recipeId,
        notes: updates.notes,
        foodCostPct: updates.foodCostPct,
      },
    });
    return mapMenuItem(row);
  },
  async deleteMenuItem(tenantId: string, id: string) {
    const existing = await prisma.menuItem.findFirst({ where: { tenantId, id } });
    if (!existing) return false;
    await prisma.menuItem.delete({ where: { id } });
    return true;
  },
  async allDailyDishes(tenantId: string) {
    const rows = await prisma.dailyDish.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
    return rows.map(mapDailyDish);
  },
  async getDailyDish(tenantId: string, id: string) {
    const row = await prisma.dailyDish.findFirst({ where: { tenantId, id } });
    return row ? mapDailyDish(row) : null;
  },
  async createDailyDish(tenantId: string, payload: Omit<DailyDish, "id">) {
    const row = await prisma.dailyDish.create({
      data: {
        tenantId,
        ...payload,
      },
    });
    return mapDailyDish(row);
  },
  async updateDailyDish(tenantId: string, id: string, updates: Partial<DailyDish>) {
    const existing = await prisma.dailyDish.findFirst({ where: { tenantId, id } });
    if (!existing) return null;
    const row = await prisma.dailyDish.update({
      where: { id },
      data: {
        name: updates.name,
        description: updates.description,
        category: updates.category,
        price: updates.price,
        allergens: updates.allergens,
        recipeId: updates.recipeId,
      },
    });
    return mapDailyDish(row);
  },
  async deleteDailyDish(tenantId: string, id: string) {
    const existing = await prisma.dailyDish.findFirst({ where: { tenantId, id } });
    if (!existing) return false;
    await prisma.dailyDish.delete({ where: { id } });
    return true;
  },
  calcRecipeFoodCost(recipe: Recipe) {
    return calcFoodCost(recipe);
  },
  async calcRecipeFoodCostRealtime(tenantId: string, recipe: Recipe) {
    const ingredientSources: Array<{
      name: string;
      unit: string;
      requiredQty: number;
      unitCost: number;
      source: "warehouse" | "recipe";
      availableQty: number | null;
      missingQty: number;
    }> = [];

    const normalizedIngredients = await Promise.all(
      recipe.ingredients.map(async (ingredient) => {
        const stockItem = await prisma.warehouseItem.findFirst({
          where: {
            tenantId,
            name: { equals: ingredient.name, mode: "insensitive" },
          },
        });
        const resolvedUnitCost = stockItem ? stockItem.costPerUnit.toNumber() : ingredient.unitCost;
        const requiredQty = ingredient.qty * (1 + ingredient.wastePct / 100);
        const availableQty = stockItem ? stockItem.qty.toNumber() : null;
        const missingQty = availableQty == null ? 0 : Math.max(0, requiredQty - availableQty);

        ingredientSources.push({
          name: ingredient.name,
          unit: ingredient.unit,
          requiredQty,
          unitCost: resolvedUnitCost,
          source: stockItem ? "warehouse" : "recipe",
          availableQty,
          missingQty,
        });

        return {
          ...ingredient,
          unitCost: resolvedUnitCost,
        };
      }),
    );

    const result = calcFoodCost({
      ...recipe,
      ingredients: normalizedIngredients,
    });

    const stockAlerts = ingredientSources
      .filter((row) => row.source === "recipe" || row.missingQty > 0)
      .map((row) => ({
        ingredient: row.name,
        message:
          row.source === "recipe"
            ? "Costo preso dalla ricetta (ingrediente non trovato in magazzino)."
            : `Scorta insufficiente: mancano ${row.missingQty.toFixed(3)} ${row.unit}.`,
      }));

    return {
      ...result,
      ingredientSources,
      stockAlerts,
    };
  },
};
