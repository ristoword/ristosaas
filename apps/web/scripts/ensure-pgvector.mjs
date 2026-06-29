/**
 * Verifica/installa pgvector + indici HNSW per RAG e memoria AI.
 * Usage: DATABASE_URL=... node scripts/ensure-pgvector.mjs
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(__dirname, "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
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

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL mancante");
  process.exit(1);
}

const prisma = new PrismaClient({ log: ["error"] });

const STEPS = [
  `CREATE EXTENSION IF NOT EXISTS vector`,
  `CREATE INDEX IF NOT EXISTS "AiVectorChunk_embedding_hnsw_idx"
     ON "AiVectorChunk" USING hnsw (embedding vector_cosine_ops)`,
  `CREATE INDEX IF NOT EXISTS "AiMemoryVector_embedding_hnsw_idx"
     ON "AiMemoryVector" USING hnsw (embedding vector_cosine_ops)`,
];

try {
  for (const sql of STEPS) {
    await prisma.$executeRawUnsafe(sql);
  }

  const ext = await prisma.$queryRaw`
    SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'
  `;
  const indexes = await prisma.$queryRaw`
    SELECT indexname FROM pg_indexes
    WHERE indexname IN ('AiVectorChunk_embedding_hnsw_idx', 'AiMemoryVector_embedding_hnsw_idx')
    ORDER BY indexname
  `;
  const tables = await prisma.$queryRaw`
    SELECT
      to_regclass('public."AiVectorChunk"')::text AS chunk_table,
      to_regclass('public."AiMemoryVector"')::text AS memory_table
  `;

  console.log(JSON.stringify({
    ok: true,
    extension: ext[0] ?? null,
    tables: tables[0],
    hnswIndexes: indexes.map((r) => r.indexname),
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
    hint: "Su PostgreSQL locale: brew install pgvector (stessa major version di Postgres), poi riavvia Postgres.",
  }, null, 2));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
