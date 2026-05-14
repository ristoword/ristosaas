import { chromium } from "playwright";

const BASE_URL = "https://ristosimply.com";
const USERNAME = "owner";
const PASSWORD = "owner123";

const PAGES = [
  { path: "/dashboard", label: "Dashboard - Panoramica", wait: 4000 },
  { path: "/rooms", label: "Sala - Mappa Tavoli", wait: 4000 },
  { path: "/cucina", label: "Cucina - Comande in Arrivo", wait: 4000 },
  { path: "/pizzeria", label: "Pizzeria", wait: 3000 },
  { path: "/bar", label: "Bar", wait: 3000 },
  { path: "/cassa", label: "Cassa - Gestione Pagamenti", wait: 4000 },
  { path: "/chiusura", label: "Chiusura Giornaliera", wait: 3000 },
  { path: "/asporto", label: "Asporto - Ordini da Asporto", wait: 3000 },
  { path: "/prenotazioni", label: "Prenotazioni Ristorante", wait: 4000 },
  { path: "/magazzino", label: "Magazzino - Gestione Scorte", wait: 4000 },
  { path: "/fornitori", label: "Fornitori", wait: 3000 },
  { path: "/menu-admin", label: "Menu Admin - Gestione Menu", wait: 4000 },
  { path: "/daily-menu", label: "Menu del Giorno", wait: 3000 },
  { path: "/food-cost", label: "Food Cost - Analisi Costi", wait: 3000 },
  { path: "/catering", label: "Catering", wait: 3000 },
  { path: "/hotel", label: "Hotel - Panoramica", wait: 4000 },
  { path: "/hotel/rooms", label: "Hotel - Gestione Camere", wait: 4000 },
  { path: "/hotel/planner", label: "Hotel - Planner Prenotazioni", wait: 4000 },
  { path: "/hotel/reservations", label: "Hotel - Prenotazioni", wait: 4000 },
  { path: "/hotel/front-desk", label: "Hotel - Reception / Front Desk", wait: 4000 },
  { path: "/hotel/housekeeping", label: "Hotel - Housekeeping", wait: 3000 },
  { path: "/hotel/keycards", label: "Hotel - Keycards", wait: 3000 },
  { path: "/hotel/folio", label: "Hotel - Folio", wait: 3000 },
  { path: "/hotel/room-service", label: "Hotel - Room Service", wait: 3000 },
  { path: "/staff", label: "Staff - Gestione Personale", wait: 4000 },
  { path: "/turni", label: "Turni - Pianificazione", wait: 3000 },
  { path: "/staff-hr", label: "Staff HR - Risorse Umane", wait: 3000 },
  { path: "/customers", label: "Clienti - Anagrafica", wait: 3000 },
  { path: "/archivio", label: "Archivio - Storico Ordini", wait: 3000 },
  { path: "/archivio-comande", label: "Archivio Comande", wait: 3000 },
  { path: "/qr-tables", label: "QR Tables - Codici Tavoli", wait: 3000 },
  { path: "/hardware", label: "Hardware - Stampanti/Dispositivi", wait: 3000 },
  { path: "/sessions", label: "Sessioni Attive", wait: 3000 },
  { path: "/owner", label: "Area Owner - Configurazione", wait: 4000 },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log("🎬 Starting demo video recording...");
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   User: ${USERNAME}`);
  console.log(`   Pages to visit: ${PAGES.length}\n`);

  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: "/workspace/apps/web/e2e/videos/",
      size: { width: 1920, height: 1080 },
    },
    locale: "it-IT",
    colorScheme: "dark",
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  // --- Login ---
  console.log("🔐 Logging in...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await sleep(2000);

  const usernameInput = page.getByPlaceholder(/owner|sala|cucina/i);
  const passwordInput = page.getByPlaceholder(/password/i);

  await usernameInput.fill(USERNAME);
  await sleep(500);
  await passwordInput.fill(PASSWORD);
  await sleep(500);

  await page.locator('button[type="submit"]').click();
  console.log("   Submitted login form, waiting for redirect...");

  try {
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    console.log("   ✅ Login successful!\n");
  } catch {
    console.log("   ⚠️  Did not reach /dashboard, checking current URL...");
    console.log(`   Current URL: ${page.url()}`);

    const bodyText = await page.textContent("body").catch(() => "");
    if (bodyText.includes("change-password") || page.url().includes("change-password")) {
      console.log("   Password change required, trying to navigate to dashboard anyway...");
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
      await sleep(3000);
    }

    if (!page.url().includes("dashboard")) {
      console.error("❌ Cannot login. Aborting.");
      const screenshot = await page.screenshot();
      const fs = await import("fs");
      fs.writeFileSync("/workspace/apps/web/e2e/videos/login-failure.png", screenshot);
      await context.close();
      await browser.close();
      process.exit(1);
    }
  }

  await sleep(3000);

  // --- Navigate through all pages ---
  for (let i = 0; i < PAGES.length; i++) {
    const { path, label, wait } = PAGES[i];
    const progress = `[${i + 1}/${PAGES.length}]`;
    console.log(`📄 ${progress} Navigating to: ${label} (${path})`);

    try {
      await page.goto(`${BASE_URL}${path}`, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });

      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

      await sleep(wait);

      // Scroll down slowly to show page content
      await page.evaluate(async () => {
        const scrollHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        if (scrollHeight > viewportHeight) {
          const steps = Math.min(3, Math.ceil((scrollHeight - viewportHeight) / viewportHeight));
          for (let s = 1; s <= steps; s++) {
            window.scrollTo({
              top: (scrollHeight * s) / (steps + 1),
              behavior: "smooth",
            });
            await new Promise((r) => setTimeout(r, 1200));
          }
          await new Promise((r) => setTimeout(r, 800));
          window.scrollTo({ top: 0, behavior: "smooth" });
          await new Promise((r) => setTimeout(r, 800));
        }
      });

      console.log(`   ✅ Done`);
    } catch (err) {
      console.log(`   ⚠️  Error on ${path}: ${err.message}`);
    }
  }

  // Final pause on dashboard
  console.log("\n🏁 Returning to dashboard for closing...");
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" }).catch(() => {});
  await sleep(3000);

  // Close and save video
  console.log("💾 Saving video...");
  await page.close();

  const video = page.video();
  if (video) {
    const videoPath = await video.path();
    console.log(`\n✅ Video saved at: ${videoPath}`);

    const targetPath = "/workspace/apps/web/e2e/videos/ristosimply-demo.webm";
    const fs = await import("fs");
    try {
      fs.copyFileSync(videoPath, targetPath);
      console.log(`📁 Copied to: ${targetPath}`);
    } catch (e) {
      console.log(`   Could not copy: ${e.message}`);
      console.log(`   Original video at: ${videoPath}`);
    }
  }

  await context.close();
  await browser.close();
  console.log("\n🎬 Demo recording complete!");
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
