/**
 * Short demo video recorder — ~35 seconds, 8 key pages.
 * Run: node apps/web/e2e/demo-video-short.mjs
 * Output: apps/web/public/landing/demo.webm
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";

const BASE_URL = "https://ristosimply.com";
const USERNAME = "owner";
const PASSWORD = "owner123";
const OUT_DIR = new URL("../public/landing/", import.meta.url).pathname;

const PAGES = [
  { path: "/dashboard",       label: "Dashboard",          wait: 3500 },
  { path: "/rooms",           label: "Sala & Tavoli",       wait: 3000 },
  { path: "/cucina",          label: "Cucina KDS",          wait: 3000 },
  { path: "/cassa",           label: "Cassa & POS",         wait: 3000 },
  { path: "/hotel",           label: "Hotel Dashboard",     wait: 3000 },
  { path: "/hotel/planner",   label: "Planner Camere",      wait: 3000 },
  { path: "/magazzino",       label: "Magazzino",           wait: 3000 },
  { path: "/staff",           label: "Staff & Turni",       wait: 3000 },
];

mkdirSync(OUT_DIR, { recursive: true });

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log("🎬 Recording short demo (~35s)…");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 800 } },
    locale: "it-IT",
    colorScheme: "dark",
  });

  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  // Login
  console.log("🔐 Login…");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await sleep(1000);
  await page.fill('input[name="username"], input[type="text"]', USERNAME);
  await page.fill('input[name="password"], input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await sleep(1500);

  // Visit each page
  for (const { path, label, wait } of PAGES) {
    console.log(`  → ${label}`);
    await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
    await sleep(wait);
  }

  // Close — triggers video save
  const videoPath = await page.video()?.path();
  await context.close();
  await browser.close();

  const saved = videoPath ?? `${OUT_DIR}demo.webm`;
  console.log(`\n✅ Video saved: ${saved}`);
  console.log("   Rename/copy to: apps/web/public/landing/demo.webm");
}

run().catch(e => { console.error(e); process.exit(1); });
