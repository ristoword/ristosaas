-- AiChatLog runtime telemetry (agent, tokens, cost, RAG usage)
ALTER TABLE "AiChatLog" ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}';
