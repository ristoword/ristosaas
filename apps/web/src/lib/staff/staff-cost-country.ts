/**
 * Staff Cost tax country is the tenant registration country.
 * Employee phone numbers must never influence this choice.
 */

export const STAFF_COST_COUNTRIES = ["IT", "NL"] as const;
export type StaffCostCountry = (typeof STAFF_COST_COUNTRIES)[number];
export const DEFAULT_STAFF_COST_COUNTRY: StaffCostCountry = "IT";

const STAFF_COST_COUNTRY_SET = new Set<string>(STAFF_COST_COUNTRIES);

export function isStaffCostCountry(value: unknown): value is StaffCostCountry {
  return typeof value === "string" && STAFF_COST_COUNTRY_SET.has(value);
}

/** Accepts only explicit IT/NL (case-insensitive). Returns null for anything else, including phone numbers. */
export function parseStaffCostCountry(value: unknown): StaffCostCountry | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return isStaffCostCountry(normalized) ? normalized : null;
}

export function resolveStaffCostCountry(value: unknown): StaffCostCountry {
  return parseStaffCostCountry(value) ?? DEFAULT_STAFF_COST_COUNTRY;
}

export function staffCostCountryFromTenant(
  tenant: { country?: unknown } | null | undefined,
): StaffCostCountry {
  return resolveStaffCostCountry(tenant?.country);
}

/**
 * Guard: staff cost must ignore employee contact details.
 * Phone-shaped strings (e.g. +39…) must never resolve to a country.
 */
export function staffCostCountryFromEmployeePhone(_phone: unknown): StaffCostCountry | null {
  return null;
}
