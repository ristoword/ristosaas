/** IVA alloggi (aliquota ridotta IT) — importi listino sono IVA inclusa. */
export const HOTEL_ACCOMMODATION_VAT_PCT = 10;

/** `HotelReservation.rate` = tariffa per notte (lorda, IVA inclusa). */
export function stayTotalFromNightly(nightlyRate: number, nights: number): number {
  const n = Math.max(1, nights);
  return +(nightlyRate * n).toFixed(2);
}

export function nightlyRateFromStayTotal(stayTotal: number, nights: number): number {
  const n = Math.max(1, nights);
  return +(stayTotal / n).toFixed(2);
}

/** Estrae IVA da importo lordo (prezzo IVA inclusa). */
export function vatFromGrossInclusive(gross: number, vatPct: number): number {
  if (vatPct <= 0 || gross === 0) return 0;
  return +(gross * vatPct / (100 + vatPct)).toFixed(2);
}

export function netFromGrossInclusive(gross: number, vatPct: number): number {
  return +(gross - vatFromGrossInclusive(gross, vatPct)).toFixed(2);
}

export type ChargeVatLine = {
  amount: number;
  vatPct: number;
  source?: string;
  section?: string;
};

/** Somma IVA stimata da righe folio (importi lordi). */
export function sumVatFromChargeLines(lines: ChargeVatLine[]): number {
  let total = 0;
  for (const row of lines) {
    if (row.source === "payment" || row.source === "meal_plan_credit") continue;
    if (row.section === "TASSA_DI_SOGGIORNO" || row.section === "TAX") continue;
    total += vatFromGrossInclusive(row.amount, row.vatPct);
  }
  return +total.toFixed(2);
}
