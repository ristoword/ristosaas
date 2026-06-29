import { describe, expect, it } from "vitest";
import { assertPartnerCanMutate, isPartnerReadOnlyRequest } from "@/lib/auth/partner";

describe("partner read-only", () => {
  it("allows GET on any path", () => {
    expect(assertPartnerCanMutate("partner", "GET", "/api/orders")).toBe(true);
  });

  it("blocks POST on mutating routes", () => {
    expect(assertPartnerCanMutate("partner", "POST", "/api/orders")).toBe(false);
    expect(assertPartnerCanMutate("partner", "DELETE", "/api/admin/tenants")).toBe(false);
  });

  it("allows POST on AI routes", () => {
    expect(isPartnerReadOnlyRequest("POST", "/api/ai/dashboard/chat")).toBe(true);
    expect(isPartnerReadOnlyRequest("POST", "/api/hotel/folio/abc/ai/chat")).toBe(true);
  });

  it("does not restrict other roles", () => {
    expect(assertPartnerCanMutate("owner", "POST", "/api/orders")).toBe(true);
  });
});
