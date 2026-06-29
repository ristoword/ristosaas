-- AI Enterprise Control Center: agents, prompts, marketplace, audit

CREATE TABLE IF NOT EXISTS "AiAgent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "module" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'openai',
  "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  "prompt" TEXT NOT NULL DEFAULT '',
  "systemPrompt" TEXT NOT NULL DEFAULT '',
  "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
  "maxTokens" INTEGER NOT NULL DEFAULT 1200,
  "memoryEnabled" BOOLEAN NOT NULL DEFAULT true,
  "ragEnabled" BOOLEAN NOT NULL DEFAULT true,
  "vectorEnabled" BOOLEAN NOT NULL DEFAULT true,
  "toolCallingEnabled" BOOLEAN NOT NULL DEFAULT true,
  "streamingEnabled" BOOLEAN NOT NULL DEFAULT true,
  "webSearchEnabled" BOOLEAN NOT NULL DEFAULT false,
  "schedulerEnabled" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiAgent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiAgent_tenantId_slug_key" ON "AiAgent"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "AiAgent_tenantId_module_active_idx" ON "AiAgent"("tenantId", "module", "active");

CREATE TABLE IF NOT EXISTS "AiPromptTemplate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "module" TEXT NOT NULL DEFAULT 'general',
  "description" TEXT NOT NULL DEFAULT '',
  "content" TEXT NOT NULL,
  "systemPrompt" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1,
  "tags" JSONB NOT NULL DEFAULT '[]',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiPromptTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiPromptTemplate_tenantId_key_key" ON "AiPromptTemplate"("tenantId", "key");
CREATE INDEX IF NOT EXISTS "AiPromptTemplate_tenantId_module_idx" ON "AiPromptTemplate"("tenantId", "module");

CREATE TABLE IF NOT EXISTS "AiPromptVersion" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "systemPrompt" TEXT NOT NULL DEFAULT '',
  "changeNote" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiPromptVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiPromptVersion_templateId_version_key" ON "AiPromptVersion"("templateId", "version");
CREATE INDEX IF NOT EXISTS "AiPromptVersion_templateId_createdAt_idx" ON "AiPromptVersion"("templateId", "createdAt");

CREATE TABLE IF NOT EXISTS "AiControlAuditLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "actorId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "actorEmail" TEXT,
  "agentId" TEXT,
  "operation" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "oldValue" JSONB,
  "newValue" JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiControlAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiControlAuditLog_tenantId_createdAt_idx" ON "AiControlAuditLog"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "AiControlAuditLog_operation_createdAt_idx" ON "AiControlAuditLog"("operation", "createdAt");
CREATE INDEX IF NOT EXISTS "AiControlAuditLog_entityType_entityId_idx" ON "AiControlAuditLog"("entityType", "entityId");

CREATE TABLE IF NOT EXISTS "AiMarketplaceAgent" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'general',
  "provider" TEXT NOT NULL DEFAULT 'openai',
  "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  "systemPrompt" TEXT NOT NULL DEFAULT '',
  "prompt" TEXT NOT NULL DEFAULT '',
  "priceLabel" TEXT NOT NULL DEFAULT 'included',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiMarketplaceAgent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiMarketplaceAgent_slug_key" ON "AiMarketplaceAgent"("slug");

CREATE TABLE IF NOT EXISTS "AiTenantMarketplaceAgent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "marketplaceId" TEXT NOT NULL,
  "installedBy" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiTenantMarketplaceAgent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiTenantMarketplaceAgent_tenantId_marketplaceId_key"
  ON "AiTenantMarketplaceAgent"("tenantId", "marketplaceId");
CREATE INDEX IF NOT EXISTS "AiTenantMarketplaceAgent_tenantId_active_idx"
  ON "AiTenantMarketplaceAgent"("tenantId", "active");

DO $$ BEGIN
  ALTER TABLE "AiAgent" ADD CONSTRAINT "AiAgent_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "AiPromptTemplate" ADD CONSTRAINT "AiPromptTemplate_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "AiPromptVersion" ADD CONSTRAINT "AiPromptVersion_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "AiPromptTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "AiControlAuditLog" ADD CONSTRAINT "AiControlAuditLog_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "AiTenantMarketplaceAgent" ADD CONSTRAINT "AiTenantMarketplaceAgent_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "AiTenantMarketplaceAgent" ADD CONSTRAINT "AiTenantMarketplaceAgent_marketplaceId_fkey"
    FOREIGN KEY ("marketplaceId") REFERENCES "AiMarketplaceAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
