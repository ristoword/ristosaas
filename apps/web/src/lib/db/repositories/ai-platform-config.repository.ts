import { prisma } from "@/lib/db/prisma";

export const AI_PLATFORM_CONFIG_ID = "default";

export type AiPlatformToggles = {
  aiMasterEnabled: boolean;
  memoryEnabled: boolean;
  ragEnabled: boolean;
  vectorDbEnabled: boolean;
  toolCallingEnabled: boolean;
  voiceAiEnabled: boolean;
  automationsEnabled: boolean;
  schedulerEnabled: boolean;
  streamingEnabled: boolean;
  webSearchEnabled: boolean;
  multiAgentEnabled: boolean;
  vectorProvider: string;
  memoryRetentionDays: number;
  ragLastSyncAt: string | null;
  ragLastError: string | null;
  memoryLastCleanupAt: string | null;
  updatedBy: string | null;
  updatedAt: string;
};

export type AiPlatformTogglePatch = Partial<
  Pick<
    AiPlatformToggles,
    | "aiMasterEnabled"
    | "memoryEnabled"
    | "ragEnabled"
    | "vectorDbEnabled"
    | "toolCallingEnabled"
    | "voiceAiEnabled"
    | "automationsEnabled"
    | "schedulerEnabled"
    | "streamingEnabled"
    | "webSearchEnabled"
    | "multiAgentEnabled"
    | "vectorProvider"
    | "memoryRetentionDays"
  >
>;

const CACHE_MS = 3000;
let configCache: { value: AiPlatformToggles; expiresAt: number } | null = null;

export function invalidateAiPlatformConfigCache() {
  configCache = null;
}

function rowToToggles(row: {
  aiMasterEnabled: boolean;
  memoryEnabled: boolean;
  ragEnabled: boolean;
  vectorDbEnabled: boolean;
  toolCallingEnabled: boolean;
  voiceAiEnabled: boolean;
  automationsEnabled: boolean;
  schedulerEnabled: boolean;
  streamingEnabled: boolean;
  webSearchEnabled: boolean;
  multiAgentEnabled: boolean;
  vectorProvider: string;
  memoryRetentionDays: number;
  ragLastSyncAt: Date | null;
  ragLastError: string | null;
  memoryLastCleanupAt: Date | null;
  updatedBy: string | null;
  updatedAt: Date;
}): AiPlatformToggles {
  return {
    aiMasterEnabled: row.aiMasterEnabled,
    memoryEnabled: row.memoryEnabled,
    ragEnabled: row.ragEnabled,
    vectorDbEnabled: row.vectorDbEnabled,
    toolCallingEnabled: row.toolCallingEnabled,
    voiceAiEnabled: row.voiceAiEnabled,
    automationsEnabled: row.automationsEnabled,
    schedulerEnabled: row.schedulerEnabled,
    streamingEnabled: row.streamingEnabled,
    webSearchEnabled: row.webSearchEnabled,
    multiAgentEnabled: row.multiAgentEnabled,
    vectorProvider: row.vectorProvider,
    memoryRetentionDays: row.memoryRetentionDays,
    ragLastSyncAt: row.ragLastSyncAt?.toISOString() ?? null,
    ragLastError: row.ragLastError,
    memoryLastCleanupAt: row.memoryLastCleanupAt?.toISOString() ?? null,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function ensureRow() {
  await prisma.aiPlatformConfig.upsert({
    where: { id: AI_PLATFORM_CONFIG_ID },
    create: { id: AI_PLATFORM_CONFIG_ID },
    update: {},
  });
}

export async function getAiPlatformConfig(): Promise<AiPlatformToggles> {
  const now = Date.now();
  if (configCache && now < configCache.expiresAt) return configCache.value;

  await ensureRow();
  const row = await prisma.aiPlatformConfig.findUniqueOrThrow({ where: { id: AI_PLATFORM_CONFIG_ID } });
  const value = rowToToggles(row);
  configCache = { value, expiresAt: now + CACHE_MS };
  return value;
}

export async function patchAiPlatformConfig(
  patch: AiPlatformTogglePatch,
  updatedBy?: string,
): Promise<AiPlatformToggles> {
  await ensureRow();
  const row = await prisma.aiPlatformConfig.update({
    where: { id: AI_PLATFORM_CONFIG_ID },
    data: {
      ...patch,
      updatedBy: updatedBy ?? undefined,
    },
  });
  invalidateAiPlatformConfigCache();
  return rowToToggles(row);
}

export async function setRagSyncResult(syncAt: Date, error: string | null) {
  await ensureRow();
  await prisma.aiPlatformConfig.update({
    where: { id: AI_PLATFORM_CONFIG_ID },
    data: {
      ragLastSyncAt: syncAt,
      ragLastError: error,
    },
  });
  invalidateAiPlatformConfigCache();
}

export async function setMemoryCleanupAt(at: Date) {
  await ensureRow();
  await prisma.aiPlatformConfig.update({
    where: { id: AI_PLATFORM_CONFIG_ID },
    data: { memoryLastCleanupAt: at },
  });
  invalidateAiPlatformConfigCache();
}
