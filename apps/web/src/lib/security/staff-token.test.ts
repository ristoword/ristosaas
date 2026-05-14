import { createStaffToken, verifyStaffToken } from "@/lib/security/staff-token";

describe("staff-token", () => {
  const params = { tenantId: "tenant_abc", staffId: "staff_123" };

  it("creates a deterministic token", () => {
    const a = createStaffToken(params);
    const b = createStaffToken(params);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(10);
  });

  it("verifies a valid token", () => {
    const token = createStaffToken(params);
    const result = verifyStaffToken(token);
    expect(result).toEqual(params);
  });

  it("returns null for tampered token", () => {
    const token = createStaffToken(params);
    const tampered = token.slice(0, -2) + "XX";
    expect(verifyStaffToken(tampered)).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(verifyStaffToken("")).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(verifyStaffToken("not-a-real-token")).toBeNull();
  });

  it("returns null for excessively long input", () => {
    expect(verifyStaffToken("a".repeat(600))).toBeNull();
  });

  it("produces different tokens for different staff", () => {
    const a = createStaffToken({ tenantId: "t1", staffId: "s1" });
    const b = createStaffToken({ tenantId: "t1", staffId: "s2" });
    expect(a).not.toBe(b);
  });

  it("produces different tokens for different tenants", () => {
    const a = createStaffToken({ tenantId: "t1", staffId: "s1" });
    const b = createStaffToken({ tenantId: "t2", staffId: "s1" });
    expect(a).not.toBe(b);
  });
});
