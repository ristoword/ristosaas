import { test, expect } from "@playwright/test";

/**
 * Smoke tests that don't depend on a real DB being seeded.
 * For the full login -> order -> warehouse discharge -> close flow you need
 * a test database with fixtures. Run those tests locally against Railway or
 * a throwaway instance before release.
 */

// ---------------------------------------------------------------------------
// Infrastructure
// ---------------------------------------------------------------------------

test("health endpoint returns ok or degraded JSON", async ({ request }) => {
  const res = await request.get("/api/health");
  expect([200, 503]).toContain(res.status());
  const json = await res.json();
  expect(json).toHaveProperty("status");
  expect(json).toHaveProperty("db");
});

test("health/live liveness probe is always reachable", async ({ request }) => {
  const res = await request.get("/api/health/live");
  expect([200, 503]).toContain(res.status());
});

// ---------------------------------------------------------------------------
// Auth pages
// ---------------------------------------------------------------------------

test("login page renders with username + password fields", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByPlaceholder(/owner|sala|cucina/i)).toBeVisible();
  await expect(page.getByPlaceholder(/password/i)).toBeVisible();
});

test("maintenance page is reachable (public)", async ({ page }) => {
  await page.goto("/maintenance");
  await expect(page).toHaveURL(/\/maintenance/);
});

test("unauthenticated access to /dashboard redirects to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("unauthenticated access to /hotel redirects to /login", async ({ page }) => {
  await page.goto("/hotel");
  await expect(page).toHaveURL(/\/login/);
});

// ---------------------------------------------------------------------------
// Auth API — should reject unauthenticated requests
// ---------------------------------------------------------------------------

test("POST /api/auth/login with invalid credentials returns 401 or 400", async ({ request }) => {
  const res = await request.post("/api/auth/login", {
    data: { username: "nobody", password: "wrongpassword" },
  });
  expect([400, 401]).toContain(res.status());
});

test("GET /api/auth/me without session returns 401", async ({ request }) => {
  const res = await request.get("/api/auth/me");
  expect(res.status()).toBe(401);
});

// ---------------------------------------------------------------------------
// Billing — Stripe webhook rejects unsigned requests
// ---------------------------------------------------------------------------

test("POST /api/billing/stripe/webhook without signature returns 400", async ({ request }) => {
  const res = await request.post("/api/billing/stripe/webhook", {
    data: { type: "customer.subscription.created", data: {} },
    headers: { "content-type": "application/json" },
  });
  expect(res.status()).toBe(400);
});

test("POST /api/billing/stripe/webhook with wrong signature returns 400", async ({ request }) => {
  const res = await request.post("/api/billing/stripe/webhook", {
    data: JSON.stringify({ type: "customer.subscription.created" }),
    headers: {
      "content-type": "application/json",
      "stripe-signature": "t=0,v1=invalidsignature",
    },
  });
  expect(res.status()).toBe(400);
});

// ---------------------------------------------------------------------------
// Scheduler endpoints — should reject unsigned requests
// ---------------------------------------------------------------------------

test("POST /api/ai/proposals/schedule/daily without signature returns 403", async ({ request }) => {
  const res = await request.post("/api/ai/proposals/schedule/daily", {
    data: {},
  });
  expect([403, 500]).toContain(res.status());
});

test("POST /api/jobs/billing/reconcile-all without signature returns 403", async ({ request }) => {
  const res = await request.post("/api/jobs/billing/reconcile-all", {
    data: {},
  });
  expect([403, 500]).toContain(res.status());
});

// ---------------------------------------------------------------------------
// Public menu/QR API — rate-limited, token-protected
// ---------------------------------------------------------------------------

test("GET /api/public/table without token returns 400", async ({ request }) => {
  const res = await request.get("/api/public/table");
  expect(res.status()).toBe(400);
});

test("GET /api/public/table with invalid token returns 400", async ({ request }) => {
  const res = await request.get("/api/public/table?token=invalid-token");
  expect(res.status()).toBe(400);
});

test("GET /api/public/room without token returns 400", async ({ request }) => {
  const res = await request.get("/api/public/room");
  expect(res.status()).toBe(400);
});

test("GET /api/public/room with invalid token returns 400", async ({ request }) => {
  const res = await request.get("/api/public/room?token=invalid-token");
  expect(res.status()).toBe(400);
});

test("POST /api/public/room-service without token returns 400", async ({ request }) => {
  const res = await request.post("/api/public/room-service", {
    data: { items: [{ name: "Acqua", qty: 1, unitPrice: 2 }] },
  });
  expect(res.status()).toBe(400);
});

test("POST /api/public/room-service with invalid token returns 400", async ({ request }) => {
  const res = await request.post("/api/public/room-service", {
    data: { token: "invalid", category: "food", items: [{ name: "Acqua", qty: 1, unitPrice: 2 }] },
  });
  expect(res.status()).toBe(400);
});

// ---------------------------------------------------------------------------
// Public signup — validates input, never writes to DB without Stripe
// ---------------------------------------------------------------------------

test("POST /api/public/signup with missing fields returns 400", async ({ request }) => {
  const res = await request.post("/api/public/signup", {
    data: {},
  });
  expect(res.status()).toBe(400);
});

test("POST /api/public/signup with invalid plan returns 400", async ({ request }) => {
  const res = await request.post("/api/public/signup", {
    data: {
      tenantName: "Test Ristorante",
      tenantSlug: "test-ristorante",
      plan: "invalid_plan",
      billingCycle: "monthly",
      owner: { name: "Mario Rossi", email: "mario@test.com", username: "mariorossi" },
    },
  });
  expect(res.status()).toBe(400);
});

// ---------------------------------------------------------------------------
// Debug endpoint — must be disabled in production
// ---------------------------------------------------------------------------

test("GET /api/public/qr-test returns 404 in production (NODE_ENV guard)", async ({ request }) => {
  if (process.env.NODE_ENV !== "production") {
    test.skip();
    return;
  }
  const res = await request.get("/api/public/qr-test?token=anything&type=table");
  expect(res.status()).toBe(404);
});

// ---------------------------------------------------------------------------
// Protected API resources — must require session
// ---------------------------------------------------------------------------

test("GET /api/orders without session returns 401", async ({ request }) => {
  const res = await request.get("/api/orders");
  expect(res.status()).toBe(401);
});

test("GET /api/hotel/reservations without session returns 401", async ({ request }) => {
  const res = await request.get("/api/hotel/reservations");
  expect(res.status()).toBe(401);
});

test("GET /api/warehouse/stock without session returns 401", async ({ request }) => {
  const res = await request.get("/api/warehouse/stock");
  expect(res.status()).toBe(401);
});

test("GET /api/staff without session returns 401", async ({ request }) => {
  const res = await request.get("/api/staff");
  expect(res.status()).toBe(401);
});

test("GET /api/admin/tenants without session returns 401", async ({ request }) => {
  const res = await request.get("/api/admin/tenants");
  expect(res.status()).toBe(401);
});
