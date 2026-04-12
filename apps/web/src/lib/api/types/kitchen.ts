export type RecipeIngredient = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  unitCost: number;
  wastePct: number;
};

export type RecipeStep = {
  id: string;
  order: number;
  text: string;
};

export type Recipe = {
  id: string;
  name: string;
  category: string;
  area: "cucina" | "pizzeria" | "bar";
  portions: number;
  sellingPrice: number;
  targetFcPct: number;
  ivaPct: number;
  overheadPct: number;
  packagingCost: number;
  laborCost: number;
  energyCost: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  notes: string;
  createdAt: string;
};

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  area: string;
  price: number;
  code: string;
  active: boolean;
  recipeId: string | null;
  notes: string;
  foodCostPct: number | null;
};

export type DailyDish = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  allergens: string;
  recipeId: string | null;
};

export type FoodCostResult = {
  ingredientCost: number;
  productionCost: number;
  portionCost: number;
  withOverhead: number;
  fcPct: number;
  margin: number;
  suggestedPrice: number;
};

export function calcFoodCost(recipe: Recipe): FoodCostResult {
  const ingredientCost = recipe.ingredients.reduce(
    (sum, i) => sum + i.qty * i.unitCost * (1 + i.wastePct / 100),
    0,
  );
  const productionCost = ingredientCost + recipe.packagingCost + recipe.laborCost + recipe.energyCost;
  const portionCost = recipe.portions > 0 ? productionCost / recipe.portions : productionCost;
  const withOverhead = portionCost * (1 + recipe.overheadPct / 100);
  const fcPct = recipe.sellingPrice > 0 ? (withOverhead / recipe.sellingPrice) * 100 : 0;
  const margin = recipe.sellingPrice - withOverhead;
  const suggestedPrice = recipe.targetFcPct > 0 ? withOverhead / (recipe.targetFcPct / 100) : 0;
  return { ingredientCost, productionCost, portionCost, withOverhead, fcPct, margin, suggestedPrice };
}
