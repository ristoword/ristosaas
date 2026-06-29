/**
 * Indicizzazione completa RAG su produzione:
 * - Manuale piattaforma
 * - Sync entità per ogni tenant
 * Usage: node --import tsx scripts/run-rag-index.ts
 * (carica DATABASE_URL + OPENAI_API_KEY da .env.local)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(dir, "..");

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep <= 0) continue;
    const key = line.slice(0, sep).trim();
    if (process.env[key] != null) continue;
    let value = line.slice(sep + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.join(webRoot, ".env"));
loadEnvFile(path.join(webRoot, ".env.local"));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL mancante");
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY?.trim()) {
  console.error("OPENAI_API_KEY mancante");
  process.exit(1);
}

const apiKey = process.env.OPENAI_API_KEY.trim();

async function main() {
  const { runRagReindex } = await import("../src/lib/ai/config-center/service");
  const { syncTenantEntities } = await import("../src/lib/ai/rag/indexing-service");
  const { prisma } = await import("../src/lib/db/prisma");

  console.log("1/2 Indicizzazione manuale piattaforma…");
  const manual = await runRagReindex(apiKey);
  console.log("   Manuale:", manual);

  const tenants = await prisma.tenant.findMany({
    where: { accessStatus: "active" },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  console.log(`2/2 Sync entità ${tenants.length} tenant…`);
  const results: Array<{ tenant: string; synced: number; indexed: number; error?: string }> = [];

  for (const tenant of tenants) {
    try {
      const r = await syncTenantEntities({ tenantId: tenant.id, apiKey });
      results.push({ tenant: tenant.name, synced: r.synced, indexed: r.indexed });
      console.log(`   ✔ ${tenant.name}: ${r.synced} doc, ${r.indexed} indicizzati`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ tenant: tenant.name, synced: 0, indexed: 0, error: msg });
      console.error(`   ✘ ${tenant.name}:`, msg);
    }
  }

  const counts = await prisma.$queryRaw<Array<{ source: string; chunks: bigint }>>`
    SELECT source, COUNT(*)::bigint AS chunks FROM "AiVectorChunk" GROUP BY source ORDER BY source
  `;
  const docs = await prisma.aiKnowledgeDocument.count({ where: { status: { not: "deleted" } } });

  console.log("\n=== Riepilogo ===");
  console.log(JSON.stringify({ manual, tenants: results, chunksBySource: counts, knowledgeDocuments: docs }, null, 2));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
