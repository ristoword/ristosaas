-- AI Platform Configuration Center (singleton toggles)
CREATE TABLE "AiPlatformConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "aiMasterEnabled" BOOLEAN NOT NULL DEFAULT true,
    "memoryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ragEnabled" BOOLEAN NOT NULL DEFAULT true,
    "vectorDbEnabled" BOOLEAN NOT NULL DEFAULT true,
    "toolCallingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "voiceAiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "automationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "schedulerEnabled" BOOLEAN NOT NULL DEFAULT true,
    "streamingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "webSearchEnabled" BOOLEAN NOT NULL DEFAULT false,
    "multiAgentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "vectorProvider" TEXT NOT NULL DEFAULT 'pgvector',
    "memoryRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "ragLastSyncAt" TIMESTAMP(3),
    "ragLastError" TEXT,
    "memoryLastCleanupAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPlatformConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AiPlatformConfig" ("id", "updatedAt")
VALUES ('default', NOW())
ON CONFLICT ("id") DO NOTHING;
