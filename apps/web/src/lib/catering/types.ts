export type CateringDishSource = "manual" | "recipe" | "menu";

export type CateringDishLine = {
  id: string;
  name: string;
  sourceType: CateringDishSource;
  sourceId: string | null;
  unitCost: number;
  sellPrice: number;
  qtyPerGuest: number;
};

export type CateringCourse = {
  id: string;
  name: string;
  dishes: CateringDishLine[];
};

export type CateringExtraLine = {
  id: string;
  label: string;
  amount: number;
  perPerson: boolean;
};

export type CateringQuoteData = {
  version: 1;
  guests: number;
  courses: CateringCourse[];
  extras: CateringExtraLine[];
  /** Prezzo vendita fisso a persona (opzionale, ignora somma piatti se attivo). */
  usePriceOverride: boolean;
  pricePerPersonOverride: number | null;
  depositAmount: number;
};

export type CateringCalcResult = {
  guests: number;
  dishCount: number;
  courseCount: number;
  foodCostTotal: number;
  foodCostPerPerson: number;
  extrasCostTotal: number;
  extrasCostPerPerson: number;
  totalExpenses: number;
  expensePerPerson: number;
  revenueFromDishes: number;
  revenueTotal: number;
  revenuePerPerson: number;
  grossProfit: number;
  profitPerPerson: number;
  marginPct: number;
  clientBudget: number;
  budgetDelta: number;
  depositAmount: number;
  balanceAfterDeposit: number;
};

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyQuote(guests = 50): CateringQuoteData {
  return {
    version: 1,
    guests: Math.max(1, guests),
    courses: [{ id: uid("c"), name: "Antipasto", dishes: [] }],
    extras: [
      { id: uid("e"), label: "Location", amount: 0, perPerson: false },
      { id: uid("e"), label: "Servizio sala", amount: 0, perPerson: true },
      { id: uid("e"), label: "Attrezzatura", amount: 0, perPerson: false },
    ],
    usePriceOverride: false,
    pricePerPersonOverride: null,
    depositAmount: 0,
  };
}

export function quoteMenuSummary(quote: CateringQuoteData): string {
  return quote.courses
    .map((c) => {
      const dishes = c.dishes.map((d) => d.name.trim()).filter(Boolean);
      if (!c.name.trim() && dishes.length === 0) return "";
      return `${c.name.trim() || "Portata"}: ${dishes.join(", ") || "—"}`;
    })
    .filter(Boolean)
    .join("\n");
}
