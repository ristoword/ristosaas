import { describe, expect, it } from "vitest";
import { parseInboundEmail } from "./inbox-parser";

describe("parseInboundEmail", () => {
  it("parses a restaurant booking", () => {
    const result = parseInboundEmail({
      fromEmail: "mario@example.com",
      fromName: "Mario Rossi",
      subject: "Prenotazione tavolo",
      bodyText: "Buonasera, vorrei prenotare per 4 persone il 15/07/2026 alle 20:30. Tel 3331234567",
      receivedAt: new Date("2026-07-01T10:00:00Z"),
    });
    expect(result.type).toBe("booking");
    if (result.type === "booking") {
      expect(result.draft.guests).toBe(4);
      expect(result.draft.date).toBe("2026-07-15");
      expect(result.draft.time).toBe("20:30");
      expect(result.draft.phone).toContain("333");
    }
  });

  it("parses an order with line items", () => {
    const result = parseInboundEmail({
      fromEmail: "cliente@example.com",
      fromName: "Cliente",
      subject: "Ordine asporto",
      bodyText: "Vorrei ordinare:\n2x Margherita\n1x Diavola",
      receivedAt: new Date("2026-07-01T10:00:00Z"),
    });
    expect(result.type).toBe("order");
    if (result.type === "order") {
      expect(result.draft.items.length).toBeGreaterThanOrEqual(2);
    }
  });
});
