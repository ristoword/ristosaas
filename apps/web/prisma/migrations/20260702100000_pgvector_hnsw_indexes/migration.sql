-- pgvector: ensure extension + HNSW indexes for cosine similarity (<=> operator)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE INDEX IF NOT EXISTS "AiVectorChunk_embedding_hnsw_idx"
  ON "AiVectorChunk" USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS "AiMemoryVector_embedding_hnsw_idx"
  ON "AiMemoryVector" USING hnsw (embedding vector_cosine_ops);
