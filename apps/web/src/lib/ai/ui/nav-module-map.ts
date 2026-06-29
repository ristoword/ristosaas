import { resolveNavAiModule } from "@/lib/ai/module-ids";

/** Mappa id navigazione → chiave modulo AI / automazione (solo UI). */
export function resolveAiModule(navId: string): string {
  return resolveNavAiModule(navId);
}

/** @deprecated Use resolveAiModule — kept for static importers during migration. */
export const NAV_TO_AI_MODULE: Record<string, string> = {
  cucina: "food_cost",
  pizzeria: "food_cost",
  magazzino: "magazzino",
  cantina: "cantina",
  bar: "cantina",
  cassa: "cassa",
  rooms: "sala",
  prenotazioni: "prenotazioni",
  hotel: "hotel",
  "hotel-rooms": "hotel",
  "hotel-reservations": "hotel",
  "hotel-checkin": "hotel",
  "hotel-housekeeping": "housekeeping",
  supervisor: "supervisor",
  staff: "staff",
  turni: "turni",
  "food-cost": "food_cost",
  dashboard: "dashboard",
  "ai-assistente": "dashboard",
  "ai-command-center": "supervisor",
};
