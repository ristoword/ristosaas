import { test, expect } from "@playwright/test";

/**
 * Smoke tests that don't depend on a real DB being seeded.
 * For the full login -> order -> warehouse discharge -> close flow you need
 * a test database with fixtures. Run those tests locally against Railway or
 * a throwaway instance before release.
 */

test("health endpoint returns ok or degraded JSON", async ({ request }) => {
  const res = await request.get("/api/health");
  expect([200, 503]).toContain(res.status());
  const json = await res.json();
  expect(json).toHaveProperty("status");
  expect(json).toHaveProperty("db");
});

test("login page renders with username + password fields", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByPlaceholder(/owner|sala|cucina/i)).toBeVisible();
  await expect(page.getByPlaceholder(/password/i)).toBeVisible();
});

test("maintenance page is reachable (public)", async ({ page }) => {
  await page.goto("/maintenance");
  // Should not bounce to /login
  await expect(page).toHaveURL(/\/maintenance/);
});
