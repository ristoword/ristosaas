import type { CateringCalcResult, CateringQuoteData } from "@/lib/catering/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeCateringQuote(
  quote: CateringQuoteData,
  clientBudget = 0,
): CateringCalcResult {
  const guests = Math.max(1, quote.guests || 1);

  let foodCostTotal = 0;
  let revenueFromDishes = 0;
  let dishCount = 0;

  for (const course of quote.courses) {
    for (const dish of course.dishes) {
      if (!dish.name.trim()) continue;
      dishCount += 1;
      const qty = Math.max(0, dish.qtyPerGuest || 0);
      foodCostTotal += (dish.unitCost || 0) * qty * guests;
      revenueFromDishes += (dish.sellPrice || 0) * qty * guests;
    }
  }

  let extrasCostTotal = 0;
  for (const extra of quote.extras) {
    const amount = extra.amount || 0;
    extrasCostTotal += extra.perPerson ? amount * guests : amount;
  }

  const totalExpenses = foodCostTotal + extrasCostTotal;

  const revenueTotal = quote.usePriceOverride && quote.pricePerPersonOverride != null
    ? quote.pricePerPersonOverride * guests
    : revenueFromDishes;

  const grossProfit = revenueTotal - totalExpenses;
  const marginPct = revenueTotal > 0 ? (grossProfit / revenueTotal) * 100 : 0;

  const depositAmount = quote.depositAmount || 0;

  return {
    guests,
    dishCount,
    courseCount: quote.courses.length,
    foodCostTotal: round2(foodCostTotal),
    foodCostPerPerson: round2(foodCostTotal / guests),
    extrasCostTotal: round2(extrasCostTotal),
    extrasCostPerPerson: round2(extrasCostTotal / guests),
    totalExpenses: round2(totalExpenses),
    expensePerPerson: round2(totalExpenses / guests),
    revenueFromDishes: round2(revenueFromDishes),
    revenueTotal: round2(revenueTotal),
    revenuePerPerson: round2(revenueTotal / guests),
    grossProfit: round2(grossProfit),
    profitPerPerson: round2(grossProfit / guests),
    marginPct: round2(marginPct),
    clientBudget: round2(clientBudget),
    budgetDelta: round2(clientBudget - revenueTotal),
    depositAmount: round2(depositAmount),
    balanceAfterDeposit: round2(revenueTotal - depositAmount),
  };
}
