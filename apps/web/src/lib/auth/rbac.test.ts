import { API_ROLE_RULES, PUBLIC_API_PREFIXES, canAccessWithRole, getApiRequiredRoles, isPublicApiPath } from "@/lib/auth/rbac";

describe("rbac", () => {
  it("allows super_admin as global override", () => {
    expect(canAccessWithRole("super_admin", ["owner"])).toBe(true);
  });

  it("does not allow owner when role is not required", () => {
    expect(canAccessWithRole("owner", ["super_admin"])).toBe(false);
  });

  it("keeps scheduler endpoint in explicit public allowlist", () => {
    expect(PUBLIC_API_PREFIXES.includes("/api/ai/proposals/schedule/daily")).toBe(true);
    expect(isPublicApiPath("/api/ai/proposals/schedule/daily")).toBe(true);
  });

  it("resolves longest matching API role rule", () => {
    expect(API_ROLE_RULES.length).toBeGreaterThan(0);
    expect(getApiRequiredRoles("/api/ai/proposals/schedule/daily")).toEqual(["super_admin"]);
  });
});
