import { describe, expect, it } from "vitest";
import { analyzeFolio, explainCharge } from "@/lib/hotel/folio-ai-service";
import { enrichCharge } from "@/lib/hotel/folio-utils";
import type { FolioCharge, FolioDetail, GuestFolio, HotelReservation } from "@/lib/api-client";

const folio: GuestFolio = {
  id: "f1",
  tenantId: "t1",
  customerId: "c1",
  stayId: "s1",
  currency: "EUR",
  balance: 120,
  status: "open",
  guestName: "Mario Rossi",
  roomCode: "204",
};

const reservation: HotelReservation = {
  id: "r1",
  customerId: "c1",
  guestName: "Mario Rossi",
  phone: "",
  email: "mario@test.it",
  roomId: "room1",
  checkInDate: "2026-06-25",
  checkOutDate: "2026-06-27",
  guests: 2,
  status: "in_casa",
  roomType: "double",
  boardType: "room_only",
  nights: 2,
  rate: 100,
  documentCode: "",
};

function charge(partial: Partial<FolioCharge>): FolioCharge {
  return {
    id: partial.id ?? "ch1",
    folioId: "f1",
    source: partial.source ?? "hotel",
    sourceId: null,
    description: partial.description ?? "Camera",
    amount: partial.amount ?? 100,
    postedAt: partial.postedAt ?? "2026-06-25T10:00:00.000Z",
    ...partial,
  };
}

describe("folio-ai-service", () => {
  it("detects duplicate charges", () => {
    const detail: FolioDetail = {
      folio,
      charges: [
        charge({ id: "a", description: "Minibar", amount: 15, source: "manual" }),
        charge({ id: "b", description: "Minibar", amount: 15, source: "manual", postedAt: "2026-06-25T10:00:00.000Z" }),
      ],
      auditLogs: [],
      attachments: [],
    };
    const analysis = analyzeFolio({ detail, reservation, customer: null });
    expect(analysis.anomalies.some((a) => a.category === "duplicati")).toBe(true);
  });

  it("blocks checkout when balance is open and critical anomaly exists", () => {
    const detail: FolioDetail = {
      folio: { ...folio, balance: 500 },
      charges: [charge({ amount: 500 })],
      auditLogs: [],
      attachments: [],
    };
    const analysis = analyzeFolio({ detail, reservation, customer: null });
    expect(analysis.checkoutChecklist.find((c) => c.id === "balance")?.status).toBe("fail");
    expect(analysis.checkoutBlocked).toBe(true);
  });

  it("suggests revenue upsell for room_only board", () => {
    const detail: FolioDetail = {
      folio,
      charges: [charge({ source: "hotel", amount: 200 })],
      auditLogs: [],
      attachments: [],
    };
    const analysis = analyzeFolio({ detail, reservation, customer: null });
    expect(analysis.revenueSuggestions.some((s) => s.service === "Colazione")).toBe(true);
  });

  it("explains charge with origin and IVA", () => {
    const row = enrichCharge(charge({ source: "restaurant", description: "Cena ristorante", amount: 85 }));
    const exp = explainCharge(row);
    expect(exp.origin).toContain("Ristorante");
    expect(exp.narrative).toContain("85.00");
    expect(exp.vatPct).toBeDefined();
  });
});
