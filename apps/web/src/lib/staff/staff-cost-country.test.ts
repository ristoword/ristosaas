import { describe, expect, it } from "vitest";
import {
  DEFAULT_STAFF_COST_COUNTRY,
  parseStaffCostCountry,
  resolveStaffCostCountry,
  staffCostCountryFromEmployeePhone,
  staffCostCountryFromTenant,
} from "./staff-cost-country";

describe("staff-cost-country", () => {
  it("accepts IT and NL, case-insensitive", () => {
    expect(parseStaffCostCountry("IT")).toBe("IT");
    expect(parseStaffCostCountry("nl")).toBe("NL");
    expect(parseStaffCostCountry(" Nl ")).toBe("NL");
  });

  it("rejects unknown values and empty input", () => {
    expect(parseStaffCostCountry("DE")).toBeNull();
    expect(parseStaffCostCountry("")).toBeNull();
    expect(parseStaffCostCountry(undefined)).toBeNull();
    expect(parseStaffCostCountry(39)).toBeNull();
  });

  it("defaults unresolved values to IT", () => {
    expect(resolveStaffCostCountry(undefined)).toBe(DEFAULT_STAFF_COST_COUNTRY);
    expect(resolveStaffCostCountry("BE")).toBe("IT");
  });

  it("reads country from the tenant registration field only", () => {
    expect(staffCostCountryFromTenant({ country: "NL" })).toBe("NL");
    expect(staffCostCountryFromTenant({ country: "IT" })).toBe("IT");
    expect(staffCostCountryFromTenant({ country: null })).toBe("IT");
    expect(staffCostCountryFromTenant(null)).toBe("IT");
  });

  it("never infers country from an employee phone number", () => {
    expect(staffCostCountryFromEmployeePhone("+39 333 1234567")).toBeNull();
    expect(staffCostCountryFromEmployeePhone("+31 6 12345678")).toBeNull();
    expect(staffCostCountryFromEmployeePhone("0039 02 1111111")).toBeNull();
    expect(resolveStaffCostCountry("+39 333 1234567")).toBe("IT");
    expect(parseStaffCostCountry("+31 6 12345678")).toBeNull();
  });

  it("uses a Dutch venue country even if the employee has an Italian phone", () => {
    const tenant = { country: "NL" };
    const employeePhone = "+39 333 1234567";
    expect(staffCostCountryFromEmployeePhone(employeePhone)).toBeNull();
    expect(staffCostCountryFromTenant(tenant)).toBe("NL");
  });
});
