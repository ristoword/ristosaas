"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  kitchenApi,
  menuApi,
  type Recipe,
  type MenuItem,
  type DailyDish,
  type FoodCostResult,
  type RecipeIngredient,
  type RecipeStep,
} from "@/lib/api-client";

export type { Recipe, RecipeIngredient, RecipeStep, MenuItem, DailyDish, FoodCostResult };

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

type MenuContextValue = {
  recipes: Recipe[];
  menuItems: MenuItem[];
  dailyDishes: DailyDish[];
  loading: boolean;
  addRecipe: (r: Omit<Recipe, "id" | "createdAt">) => Promise<Recipe>;
  updateRecipe: (id: string, updates: Partial<Omit<Recipe, "id" | "createdAt">>) => Promise<void>;
  removeRecipe: (id: string) => Promise<void>;
  addToMenu: (recipe: Recipe) => Promise<void>;
  addToDailyMenu: (recipe: Recipe, description?: string) => Promise<void>;
  addMenuItem: (item: Omit<MenuItem, "id">) => Promise<void>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  removeMenuItem: (id: string) => Promise<void>;
  addMenuItemFromDaily: (dish: DailyDish) => Promise<void>;
  addDailyDish: (dish: Omit<DailyDish, "id">) => Promise<void>;
  removeDailyDish: (id: string) => Promise<void>;
  updateDailyDish: (id: string, updates: Partial<DailyDish>) => Promise<void>;
  addDailyFromMenuItem: (item: MenuItem) => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<MenuContextValue | null>(null);

export function useMenu() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMenu must be inside MenuProvider");
  return ctx;
}

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [dailyDishes, setDailyDishes] = useState<DailyDish[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [r, m, d] = await Promise.all([
        kitchenApi.listRecipes(),
        menuApi.listItems(),
        menuApi.listDaily(),
      ]);
      setRecipes(r);
      setMenuItems(m);
      setDailyDishes(d);
    } catch (e) {
      console.error("MenuProvider refresh:", e instanceof Error ? e.message : e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addRecipe = useCallback(async (r: Omit<Recipe, "id" | "createdAt">): Promise<Recipe> => {
    const { recipe } = await kitchenApi.createRecipe(r);
    setRecipes((p) => [recipe, ...p]);
    return recipe;
  }, []);

  const updateRecipe = useCallback(async (id: string, updates: Partial<Omit<Recipe, "id" | "createdAt">>) => {
    const { recipe } = await kitchenApi.updateRecipe(id, updates);
    setRecipes((p) => p.map((r) => (r.id === id ? recipe : r)));
  }, []);

  const removeRecipe = useCallback(async (id: string) => {
    await kitchenApi.deleteRecipe(id);
    setRecipes((p) => p.filter((r) => r.id !== id));
  }, []);

  const addToMenu = useCallback(async (recipe: Recipe) => {
    const item = await menuApi.createItem({
      fromRecipeId: recipe.id, name: recipe.name, category: recipe.category,
      area: recipe.area, price: recipe.sellingPrice, code: "", active: true,
      recipeId: recipe.id, notes: "", foodCostPct: null,
    });
    setMenuItems((p) => [item, ...p]);
  }, []);

  const addToDailyMenu = useCallback(async (recipe: Recipe, description = "") => {
    const dish = await menuApi.createDaily({
      fromRecipeId: recipe.id, name: recipe.name, description,
      category: recipe.category, price: recipe.sellingPrice,
      allergens: "", recipeId: recipe.id,
    });
    setDailyDishes((p) => [dish, ...p]);
  }, []);

  const addMenuItem = useCallback(async (item: Omit<MenuItem, "id">) => {
    const created = await menuApi.createItem(item);
    setMenuItems((p) => [created, ...p]);
  }, []);

  const updateMenuItem = useCallback(async (id: string, updates: Partial<MenuItem>) => {
    const updated = await menuApi.updateItem(id, updates);
    setMenuItems((p) => p.map((i) => (i.id === id ? updated : i)));
  }, []);

  const removeMenuItem = useCallback(async (id: string) => {
    await menuApi.deleteItem(id);
    setMenuItems((p) => p.filter((i) => i.id !== id));
  }, []);

  const addMenuItemFromDaily = useCallback(async (dish: DailyDish) => {
    const created = await menuApi.createItem({
      name: dish.name,
      category: dish.category,
      area: "cucina",
      price: dish.price,
      code: "",
      active: true,
      recipeId: dish.recipeId,
      notes: dish.description || "",
      foodCostPct: null,
    });
    setMenuItems((p) => [created, ...p]);
  }, []);

  const addDailyDish = useCallback(async (dish: Omit<DailyDish, "id">) => {
    const created = await menuApi.createDaily(dish);
    setDailyDishes((p) => [created, ...p]);
  }, []);

  const removeDailyDish = useCallback(async (id: string) => {
    await menuApi.deleteDaily(id);
    setDailyDishes((p) => p.filter((d) => d.id !== id));
  }, []);

  const updateDailyDish = useCallback(async (id: string, updates: Partial<DailyDish>) => {
    const updated = await menuApi.updateDaily(id, updates);
    setDailyDishes((p) => p.map((d) => (d.id === id ? updated : d)));
  }, []);

  const addDailyFromMenuItem = useCallback(async (item: MenuItem) => {
    const created = await menuApi.createDaily({
      name: item.name,
      category: item.category,
      description: item.notes || "",
      price: item.price,
      allergens: "",
      recipeId: item.recipeId,
    });
    setDailyDishes((p) => [created, ...p]);
  }, []);

  return (
    <Ctx.Provider value={{ recipes, menuItems, dailyDishes, loading, addRecipe, updateRecipe, removeRecipe, addToMenu, addToDailyMenu, addMenuItem, updateMenuItem, removeMenuItem, addMenuItemFromDaily, addDailyDish, removeDailyDish, updateDailyDish, addDailyFromMenuItem, refresh }}>
      {children}
    </Ctx.Provider>
  );
}
