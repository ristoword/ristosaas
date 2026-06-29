/** Etichette UI hotel — niente riferimenti demo in dashboard. */

export const PRODUCT_BRAND = "RistoSimply";

/** Nome struttura da tenant DB, senza suffissi demo/marketing. */
export function displayPropertyName(name: string | undefined): string {
  if (!name?.trim()) return "—";
  const cleaned = name
    .replace(/\s*\bdemo\b/gi, "")
    .replace(/\bristosaas\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "—";
}
