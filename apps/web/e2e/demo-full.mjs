/**
 * Full demo video — RistoSimply platform walkthrough.
 *
 * Usage:
 *   node e2e/demo-full.mjs [BASE_URL]
 *
 * Default BASE_URL: https://ristosaas-production.up.railway.app
 * Records a .webm video to apps/web/public/landing/demo-full.webm
 */

import { chromium } from "@playwright/test";

const BASE = process.argv[2] || "https://ristosaas-production.up.railway.app";
const USER = "owner";
const PASS = "owner123";

const SLOW = 600;   // ms between actions for readability
const PAUSE = 2500;  // ms to pause on each page so viewer can absorb
const LONG_PAUSE = 4000;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function safeClick(page, selector, opts = {}) {
  try {
    const el = page.locator(selector).first();
    await el.waitFor({ state: "visible", timeout: 4000 });
    await el.click(opts);
  } catch {
    // element not found, skip
  }
}

async function safeType(page, selector, text) {
  try {
    const el = page.locator(selector).first();
    await el.waitFor({ state: "visible", timeout: 4000 });
    await el.click();
    await el.fill(text);
  } catch {
    // skip
  }
}

async function navigateTo(page, path, label) {
  console.log(`  → ${label} (${path})`);
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
  await sleep(PAUSE);
}

async function scrollPage(page) {
  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  });
  await sleep(1500);
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  await sleep(800);
}

(async () => {
  console.log("🎬 Starting full demo recording…");
  console.log(`   Base URL: ${BASE}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: "./e2e-videos", size: { width: 1440, height: 900 } },
    locale: "it-IT",
  });
  const page = await context.newPage();

  // ════════════════════════════════════════════════════════
  // 1. HOMEPAGE (before login)
  // ════════════════════════════════════════════════════════
  console.log("\n📌 1. Homepage");
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 20000 });
  await sleep(LONG_PAUSE);
  await scrollPage(page);
  await sleep(PAUSE);

  // ════════════════════════════════════════════════════════
  // 2. LOGIN
  // ════════════════════════════════════════════════════════
  console.log("\n📌 2. Login");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 15000 });
  await sleep(1000);
  await safeType(page, 'input[name="username"], input[type="text"]', USER);
  await sleep(SLOW);
  await safeType(page, 'input[name="password"], input[type="password"]', PASS);
  await sleep(SLOW);
  await safeClick(page, 'button[type="submit"]');
  await sleep(3000);
  await page.waitForURL("**/dashboard**", { timeout: 10000 }).catch(() => {});
  await sleep(PAUSE);

  // ════════════════════════════════════════════════════════
  // 3. DASHBOARD
  // ════════════════════════════════════════════════════════
  console.log("\n📌 3. Dashboard");
  await scrollPage(page);
  await sleep(PAUSE);

  // Show language selector
  console.log("  → Showing language options");
  await safeClick(page, '[data-testid="language-selector"], button:has-text("IT"), button:has-text("🇮🇹")');
  await sleep(1500);

  // Switch to English briefly
  await safeClick(page, 'button:has-text("EN"), [data-lang="en"]');
  await sleep(2000);

  // Switch back to Italian
  await safeClick(page, 'button:has-text("IT"), [data-lang="it"]');
  await sleep(1500);

  // ════════════════════════════════════════════════════════
  // 4. OPEN SIDEBAR — show all menu sections
  // ════════════════════════════════════════════════════════
  console.log("\n📌 4. Sidebar menu showcase");
  // The sidebar should already be visible on desktop, scroll through it
  await sleep(PAUSE);

  // ════════════════════════════════════════════════════════
  // 5. AI ASSISTENTE
  // ════════════════════════════════════════════════════════
  console.log("\n📌 5. AI Assistente");
  await navigateTo(page, "/ai-assistente", "AI Assistente");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 6. SALA — Full order workflow
  // ════════════════════════════════════════════════════════
  console.log("\n📌 6. Sala — order workflow");
  await navigateTo(page, "/rooms", "Sala");
  await scrollPage(page);
  await sleep(PAUSE);

  // Click on a table to start an order
  console.log("  → Selecting a table");
  await safeClick(page, '[data-testid="table-1"], .table-card:first-child, [class*="table"]:first-child button');
  await sleep(PAUSE);

  // Try to open order modal
  console.log("  → Opening order creation");
  await safeClick(page, 'button:has-text("Nuova comanda"), button:has-text("Ordine"), button:has-text("Nuovo")');
  await sleep(PAUSE);

  // ════════════════════════════════════════════════════════
  // 7. CUCINA — Kitchen Display
  // ════════════════════════════════════════════════════════
  console.log("\n📌 7. Cucina (KDS)");
  await navigateTo(page, "/cucina", "Cucina");
  await scrollPage(page);
  await sleep(LONG_PAUSE);

  // ════════════════════════════════════════════════════════
  // 8. PIZZERIA
  // ════════════════════════════════════════════════════════
  console.log("\n📌 8. Pizzeria KDS");
  await navigateTo(page, "/pizzeria", "Pizzeria");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 9. BAR
  // ════════════════════════════════════════════════════════
  console.log("\n📌 9. Bar KDS");
  await navigateTo(page, "/bar", "Bar");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 10. CASSA
  // ════════════════════════════════════════════════════════
  console.log("\n📌 10. Cassa (POS)");
  await navigateTo(page, "/cassa", "Cassa");
  await scrollPage(page);
  await sleep(PAUSE);

  // ════════════════════════════════════════════════════════
  // 11. CHIUSURA Z
  // ════════════════════════════════════════════════════════
  console.log("\n📌 11. Chiusura Z");
  await navigateTo(page, "/chiusura", "Chiusura Z");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 12. ASPORTO
  // ════════════════════════════════════════════════════════
  console.log("\n📌 12. Asporto");
  await navigateTo(page, "/asporto", "Asporto");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 13. PRENOTAZIONI
  // ════════════════════════════════════════════════════════
  console.log("\n📌 13. Prenotazioni");
  await navigateTo(page, "/prenotazioni", "Prenotazioni");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 14. HOTEL Section
  // ════════════════════════════════════════════════════════
  console.log("\n📌 14. Hotel Dashboard");
  await navigateTo(page, "/hotel", "Hotel Dashboard");
  await scrollPage(page);
  await sleep(LONG_PAUSE);

  console.log("  → Hotel Rooms");
  await navigateTo(page, "/hotel/rooms", "Camere");
  await scrollPage(page);

  console.log("  → Hotel Planner");
  await navigateTo(page, "/hotel/planner", "Planner Camere");
  await scrollPage(page);

  console.log("  → Hotel Reservations");
  await navigateTo(page, "/hotel/reservations", "Prenotazioni Hotel");
  await scrollPage(page);

  console.log("  → Hotel Front Desk");
  await navigateTo(page, "/hotel/front-desk", "Check-in/Check-out");
  await scrollPage(page);

  console.log("  → Housekeeping");
  await navigateTo(page, "/hotel/housekeeping", "Housekeeping");
  await scrollPage(page);

  console.log("  → Room Service");
  await navigateTo(page, "/hotel/room-service", "Room Service");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 15. MAGAZZINO
  // ════════════════════════════════════════════════════════
  console.log("\n📌 15. Magazzino");
  await navigateTo(page, "/magazzino", "Magazzino");
  await scrollPage(page);
  await sleep(LONG_PAUSE);

  // ════════════════════════════════════════════════════════
  // 16. FORNITORI
  // ════════════════════════════════════════════════════════
  console.log("\n📌 16. Fornitori");
  await navigateTo(page, "/fornitori", "Fornitori");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 17. MENU ADMIN
  // ════════════════════════════════════════════════════════
  console.log("\n📌 17. Menu Admin");
  await navigateTo(page, "/menu-admin", "Menu Admin");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 18. MENU DEL GIORNO
  // ════════════════════════════════════════════════════════
  console.log("\n📌 18. Menu del Giorno");
  await navigateTo(page, "/daily-menu", "Menu del Giorno");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 19. FOOD COST
  // ════════════════════════════════════════════════════════
  console.log("\n📌 19. Food Cost");
  await navigateTo(page, "/food-cost", "Food Cost");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 20. CATERING
  // ════════════════════════════════════════════════════════
  console.log("\n📌 20. Catering");
  await navigateTo(page, "/catering", "Catering");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 21. STAFF
  // ════════════════════════════════════════════════════════
  console.log("\n📌 21. Staff");
  await navigateTo(page, "/staff", "Staff");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 22. TURNI
  // ════════════════════════════════════════════════════════
  console.log("\n📌 22. Turni");
  await navigateTo(page, "/turni", "Turni");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 23. STAFF HR
  // ════════════════════════════════════════════════════════
  console.log("\n📌 23. Staff HR");
  await navigateTo(page, "/staff-hr", "Staff HR");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 24. IL MIO PROFILO
  // ════════════════════════════════════════════════════════
  console.log("\n📌 24. Il Mio Profilo");
  await navigateTo(page, "/staff-me", "Il Mio Profilo");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 25. CRM CLIENTI
  // ════════════════════════════════════════════════════════
  console.log("\n📌 25. CRM Clienti");
  await navigateTo(page, "/customers", "CRM Clienti");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 26. SUPERVISOR
  // ════════════════════════════════════════════════════════
  console.log("\n📌 26. Supervisor");
  await navigateTo(page, "/supervisor", "Supervisor");
  await scrollPage(page);
  await sleep(LONG_PAUSE);

  // ════════════════════════════════════════════════════════
  // 27. ARCHIVIO
  // ════════════════════════════════════════════════════════
  console.log("\n📌 27. Archivio");
  await navigateTo(page, "/archivio", "Archivio");
  await scrollPage(page);

  console.log("  → Archivio Comande");
  await navigateTo(page, "/archivio-comande", "Archivio Comande");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 28. HARDWARE / QR
  // ════════════════════════════════════════════════════════
  console.log("\n📌 28. Hardware & QR");
  await navigateTo(page, "/hardware", "Hardware / Stampa");
  await scrollPage(page);

  await navigateTo(page, "/qr-tables", "QR Tavoli");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 29. OWNER
  // ════════════════════════════════════════════════════════
  console.log("\n📌 29. Area Owner");
  await navigateTo(page, "/owner", "Area Owner");
  await scrollPage(page);
  await sleep(LONG_PAUSE);

  // ════════════════════════════════════════════════════════
  // 30. SESSIONI
  // ════════════════════════════════════════════════════════
  console.log("\n📌 30. Sessioni");
  await navigateTo(page, "/sessions", "Sessioni");
  await scrollPage(page);

  // ════════════════════════════════════════════════════════
  // 31. Final — back to dashboard
  // ════════════════════════════════════════════════════════
  console.log("\n📌 31. Final — back to dashboard");
  await navigateTo(page, "/dashboard", "Dashboard (finale)");
  await sleep(LONG_PAUSE);

  // ════════════════════════════════════════════════════════
  // DONE — save video
  // ════════════════════════════════════════════════════════
  console.log("\n🎬 Recording complete. Saving video…");
  await page.close();
  const video = page.video();
  if (video) {
    const path = await video.path();
    console.log(`✅ Video saved: ${path}`);
    
    // Copy to public landing folder
    const fs = await import("node:fs/promises");
    const dest = "./public/landing/demo-full.webm";
    await fs.copyFile(path, dest).catch(() => {});
    console.log(`✅ Copied to: ${dest}`);
  }

  await context.close();
  await browser.close();
  console.log("\n🎉 Done!");
})();
