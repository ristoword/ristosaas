import type { DailyDish, MenuItem } from "@/lib/api/types/kitchen";
import { uid } from "@/lib/store/id";

const menuItems = new Map<string, MenuItem>();
const dailyDishes = new Map<string, DailyDish>();

const SEED_MENU: Omit<MenuItem, "id">[] = [
  { name: "Margherita", category: "Pizze", area: "Pizzeria", price: 8, code: "PZ01", active: true, recipeId: null, notes: "", foodCostPct: 28 },
  { name: "Carbonara", category: "Primi", area: "Cucina", price: 12, code: "PR01", active: true, recipeId: null, notes: "", foodCostPct: 25 },
  { name: "Tiramisù", category: "Dolci", area: "Cucina", price: 7, code: "DO01", active: true, recipeId: null, notes: "", foodCostPct: 22 },
  { name: "Bruschetta mista", category: "Antipasti", area: "Cucina", price: 9, code: "AN01", active: true, recipeId: null, notes: "Senza glutine su richiesta", foodCostPct: 20 },
  { name: "Grigliata mista", category: "Secondi", area: "Cucina", price: 18, code: "SE01", active: true, recipeId: null, notes: "", foodCostPct: 30 },
  { name: "Diavola", category: "Pizze", area: "Pizzeria", price: 10, code: "PZ02", active: true, recipeId: null, notes: "Piccante", foodCostPct: 26 },
  { name: "Tagliata di manzo", category: "Secondi", area: "Cucina", price: 22, code: "SE02", active: true, recipeId: null, notes: "Con rucola e grana", foodCostPct: 32 },
  { name: "Spritz", category: "Bevande", area: "Bar", price: 7, code: "BV01", active: true, recipeId: null, notes: "", foodCostPct: 15 },
];

const SEED_DAILY: Omit<DailyDish, "id">[] = [
  { name: "Vellutata di zucca", description: "Con crostini e olio al rosmarino", category: "Primi", price: 10, allergens: "Glutine", recipeId: null },
  { name: "Risotto ai funghi porcini", description: "Riso Carnaroli mantecato al parmigiano", category: "Primi", price: 14, allergens: "Lattosio", recipeId: null },
  { name: "Filetto al pepe verde", description: "Con purè di patate", category: "Secondi", price: 22, allergens: "", recipeId: null },
];

for (const item of SEED_MENU) {
  const id = uid("mi");
  menuItems.set(id, { ...item, id });
}

for (const dish of SEED_DAILY) {
  const id = uid("dd");
  dailyDishes.set(id, { ...dish, id });
}

export const menuItemsStore = {
  all: () => [...menuItems.values()],
  get: (id: string) => menuItems.get(id),
  set: (id: string, item: MenuItem) => menuItems.set(id, item),
  delete: (id: string) => menuItems.delete(id),
  size: () => menuItems.size,
};

export const dailyDishesStore = {
  all: () => [...dailyDishes.values()],
  get: (id: string) => dailyDishes.get(id),
  set: (id: string, dish: DailyDish) => dailyDishes.set(id, dish),
  delete: (id: string) => dailyDishes.delete(id),
  size: () => dailyDishes.size,
};
