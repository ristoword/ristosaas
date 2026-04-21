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

  it("ammette cassa sui prefissi che ora includono il ruolo (chiusura drift)", () => {
    // Drift fix 2026-04-21: cassa era consentito nei handler ma bloccato dal middleware.
    const menu = getApiRequiredRoles("/api/menu/items");
    const tables = getApiRequiredRoles("/api/tables");
    const rooms = getApiRequiredRoles("/api/rooms");
    const purchaseOrders = getApiRequiredRoles("/api/purchase-orders");
    const catering = getApiRequiredRoles("/api/catering");
    expect(menu).toContain("cassa");
    expect(tables).toContain("cassa");
    expect(rooms).toContain("cassa");
    expect(purchaseOrders).toContain("cassa");
    expect(catering).toContain("cassa");
  });

  it("ammette staff sulle route staff proprie (chiusura drift)", () => {
    // Drift fix 2026-04-21: ruolo staff era dichiarato negli handler ma non nel middleware.
    const staff = getApiRequiredRoles("/api/staff");
    const shifts = getApiRequiredRoles("/api/staff/shifts");
    expect(staff).toContain("staff");
    expect(shifts).toContain("staff");
  });

  it("ammette supervisor sulle integration route (chiusura drift)", () => {
    // Drift fix 2026-04-21: supervisor passava il middleware ma veniva rifiutato dal handler.
    const integration = getApiRequiredRoles("/api/integration");
    expect(integration).toContain("supervisor");
  });

  it("ammette hotel_manager e reception sui report (chiusura drift)", () => {
    // Drift fix 2026-04-21: hotel_manager/reception erano dichiarati nel handler reports ma bloccati dal middleware.
    const reports = getApiRequiredRoles("/api/reports");
    expect(reports).toContain("hotel_manager");
    expect(reports).toContain("reception");
  });
});
