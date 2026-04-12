import type { Recipe } from "@/lib/api/types/kitchen";

const recipes = new Map<string, Recipe>();

export const recipesStore = {
  all: () => [...recipes.values()],
  get: (id: string) => recipes.get(id),
  set: (id: string, recipe: Recipe) => recipes.set(id, recipe),
  delete: (id: string) => recipes.delete(id),
  size: () => recipes.size,
};
