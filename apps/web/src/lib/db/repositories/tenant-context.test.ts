import { getTenantId, getTenantIdFromRequest, setTenantIdContext } from "@/lib/db/repositories/tenant-context";

describe("tenant-context", () => {
  it("throws when no scoped tenant is available", () => {
    expect(() => getTenantId()).toThrow("Tenant context is required");
  });

  it("uses scoped tenant set by guard flow", () => {
    const tenantId = `tenant_${Date.now()}`;
    setTenantIdContext(tenantId);
    expect(getTenantId()).toBe(tenantId);
  });

  it("uses fallback tenant and ignores untrusted header", () => {
    const request = { headers: new Headers({ "x-tenant-id": "tenant_header" }) };
    expect(getTenantIdFromRequest(request, "tenant_fallback")).toBe("tenant_fallback");
  });
});
