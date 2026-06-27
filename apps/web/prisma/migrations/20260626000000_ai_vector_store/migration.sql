-- pgvector: semantic search for AI RAG (platform manual knowledge)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "AiVectorChunk" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "chunkKey" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embeddingModel" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiVectorChunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiVectorChunk_source_chunkKey_key" ON "AiVectorChunk"("source", "chunkKey");
CREATE INDEX "AiVectorChunk_source_idx" ON "AiVectorChunk"("source");
