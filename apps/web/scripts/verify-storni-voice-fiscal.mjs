/**
 * Verifica post-migrazione: tabelle presenti + round-trip CRUD Prisma sui tre modelli.
 * Richiede DATABASE_URL (.env.local / .env).
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(__dirname, "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep <= 0) continue;
    const key = line.slice(0, sep).trim();
    if (!key || process.env[key] != null) continue;
    let value = line.slice(sep + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(resolve(WEB_ROOT, ".env.local"));
loadEnvFile(resolve(WEB_ROOT, ".env"));

async function tableExists(prisma, name) {
  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${name}
    ) AS "exists"
  `;
  return Boolean(rows[0]?.exists);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(JSON.stringify({ ok: false, error: "DATABASE_URL mancante" }));
    process.exit(1);
  }

  const prisma = new PrismaClient({ log: ["error"] });
  const report = { ok: true, steps: [] };

  try {
    for (const t of ["SupervisorStorno", "WarehouseVoiceLog", "ArchivioFiscalStub"]) {
      const ex = await tableExists(prisma, t);
      report.steps.push({ check: `table_${t}`, ok: ex });
      if (!ex) {
        report.ok = false;
        report.error = `Tabella mancante: ${t}. Esegui prima scripts/apply-storni-voice-fiscal-sql.mjs`;
        console.log(JSON.stringify(report, null, 2));
        process.exit(1);
      }
    }

    const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) {
      report.ok = false;
      report.error = "Nessun tenant nel DB: impossibile test CRUD.";
      console.log(JSON.stringify(report, null, 2));
      process.exit(1);
    }

    const storno = await prisma.supervisorStorno.create({
      data: {
        tenantId: tenant.id,
        amount: 1.23,
        motivo: "__verify_script__",
        tavolo: "T0",
        ordineId: "",
        note: "",
      },
    });
    report.steps.push({ check: "supervisorStorno.create", ok: true, id: storno.id });

    const voice = await prisma.warehouseVoiceLog.create({
      data: { tenantId: tenant.id, transcript: "__verify_script__ voice" },
    });
    report.steps.push({ check: "warehouseVoiceLog.create", ok: true, id: voice.id });

    const fiscal = await prisma.archivioFiscalStub.create({
      data: {
        tenantId: tenant.id,
        kind: "entrata",
        reference: "VER-1",
        counterparty: "Test",
        amount: 10,
        vatRateNote: "22%",
        notes: "__verify_script__",
      },
    });
    report.steps.push({ check: "archivioFiscalStub.create", ok: true, id: fiscal.id });

    await prisma.supervisorStorno.delete({ where: { id: storno.id } });
    await prisma.warehouseVoiceLog.delete({ where: { id: voice.id } });
    await prisma.archivioFiscalStub.delete({ where: { id: fiscal.id } });
    report.steps.push({ check: "cleanup", ok: true });

    console.log(JSON.stringify(report, null, 2));
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
