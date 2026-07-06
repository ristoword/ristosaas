import { chromium } from "playwright";

const BASE_URL = "https://ristosimply.com";
const USERNAME = "owner";
const PASSWORD = "owner123";
const SCREENSHOT_DIR = "/workspace/apps/web/e2e/videos/screenshots";

const KEY_PAGES = [
  { path: "/login", label: "01-login", noAuth: true },
  { path: "/dashboard", label: "02-dashboard" },
  { path: "/rooms", label: "03-sala" },
  { path: "/cucina", label: "04-cucina" },
  { path: "/bar", label: "05-bar" },
  { path: "/cassa", label: "06-cassa" },
  { path: "/prenotazioni", label: "07-prenotazioni" },
  { path: "/magazzino", label: "08-magazzino" },
  { path: "/menu-admin", label: "09-menu-admin" },
  { path: "/hotel", label: "10-hotel" },
  { path: "/hotel/rooms", label: "11-hotel-rooms" },
  { path: "/hotel/planner", label: "12-hotel-planner" },
  { path: "/hotel/reservations", label: "13-hotel-reservations" },
  { path: "/hotel/front-desk", label: "14-hotel-reception" },
  { path: "/hotel/housekeeping", label: "15-hotel-housekeeping" },
  { path: "/staff", label: "16-staff" },
  { path: "/turni", label: "17-turni" },
  { path: "/owner", label: "18-owner" },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const fs = await import("fs");
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: "it-IT",
    colorScheme: "dark",
  });
  const page = await context.newPage();

  // Screenshot login page first
  console.log("Taking login page screenshot...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await sleep(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-login.png`, fullPage: false });

  // Login
  console.log("Logging in...");
  await page.getByPlaceholder(/owner|sala|cucina/i).fill(USERNAME);
  await page.getByPlaceholder(/password/i).fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/dashboard**", { timeout: 15000 });
  await sleep(3000);

  // Screenshot each key page
  for (const { path, label, noAuth } of KEY_PAGES) {
    if (noAuth) continue;
    console.log(`Capturing: ${label} (${path})`);
    try {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      await sleep(2500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${label}.png`, fullPage: false });
      console.log(`  Done`);
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }

  await context.close();
  await browser.close();
  console.log("\nAll screenshots captured!");
}

run().catch(console.error);
