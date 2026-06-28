import { describe, expect, it } from "vitest";
import { enrichCharge, mapChargeToSection, computeEconomics } from "@/lib/hotel/folio-utils";
import type { FolioCharge, GuestFolio, HotelReservation } from "@/lib/api-client";

const charge = (partial: Partial<FolioCharge>): FolioCharge => ({
  id: partial.id ?? "c1",
  folioId: "f1",
  source: partial.source ?? "restaurant",
  sourceId: null,
  description: partial.description ?? "Cena",
  amount: partial.amount ?? 45,
  postedAt: partial.postedAt ?? "2026-06-27T20:00:00.000Z",
});

describe("folio-utils", () => {
  it("maps restaurant bar description to BAR section", () => {
    expect(mapChargeToSection(charge({ description: "Bar — Negroni", source: "restaurant" }))).toBe("BAR");
  });

  it("maps city tax to TASSA_DI_SOGGIORNO", () => {
    expect(mapChargeToSection(charge({ source: "city_tax", description: "Tassa di soggiorno" }))).toBe(
      "TASSA_DI_SOGGIORNO",
    );
  });

  it("computes economics with payments", () => {
    const rows = [
      enrichCharge(charge({ id: "1", amount: 100, source: "restaurant" })),
      enrichCharge(charge({ id: "2", amount: -30, source: "payment", description: "Pagamento (carta)" })),
    ];
    const folio: GuestFolio = {
      id: "f1",
      tenantId: "t1",
      customerId: "cu1",
      stayId: "s1",
      currency: "EUR",
      balance: 70,
      status: "open",
    };
    const econ = computeEconomics(rows, folio, null);
    expect(econ.paidTotal).toBe(30);
    expect(econ.extraTotal).toBe(100);
  });
});
