import {
  getAiPlatformConfig,
  type AiPlatformToggles,
} from "@/lib/db/repositories/ai-platform-config.repository";

/** Env kill-switches override DB toggles when set to "false". */
function envAllows(flag: string | undefined): boolean {
  return flag !== "false";
}

export type AiFeatureKey =
  | "master"
  | "memory"
  | "rag"
  | "vectorDb"
  | "toolCalling"
  | "voice"
  | "automations"
  | "scheduler"
  | "streaming"
  | "webSearch"
  | "multiAgent";

const ENV_MAP: Record<AiFeatureKey, string | undefined> = {
  master: process.env.AI_MASTER_ENABLED,
  memory: process.env.AI_MEMORY_ENABLED,
  rag: process.env.AI_RAG_ENABLED,
  vectorDb: process.env.AI_VECTOR_DB_ENABLED,
  toolCalling: process.env.AI_TOOL_CALLING_ENABLED,
  voice: process.env.AI_VOICE_ENABLED,
  automations: process.env.AI_AUTOMATION_ENABLED,
  scheduler: process.env.AI_SCHEDULER_ENABLED,
  streaming: process.env.AI_STREAMING_ENABLED,
  webSearch: process.env.AI_WEB_SEARCH_ENABLED,
  multiAgent: process.env.AI_MULTI_AGENT_ENABLED,
};

function dbToggle(config: AiPlatformToggles, key: AiFeatureKey): boolean {
  switch (key) {
    case "master":
      return config.aiMasterEnabled;
    case "memory":
      return config.memoryEnabled;
    case "rag":
      return config.ragEnabled;
    case "vectorDb":
      return config.vectorDbEnabled;
    case "toolCalling":
      return config.toolCallingEnabled;
    case "voice":
      return config.voiceAiEnabled;
    case "automations":
      return config.automationsEnabled;
    case "scheduler":
      return config.schedulerEnabled;
    case "streaming":
      return config.streamingEnabled;
    case "webSearch":
      return config.webSearchEnabled;
    case "multiAgent":
      return config.multiAgentEnabled;
  }
}

export async function isAiFeatureEnabled(key: AiFeatureKey): Promise<boolean> {
  if (!envAllows(ENV_MAP[key])) return false;
  try {
    const config = await getAiPlatformConfig();
    if (!config.aiMasterEnabled && key !== "master") return false;
    return dbToggle(config, key);
  } catch {
    return envAllows(ENV_MAP[key]);
  }
}

/** Sync check using cached config — for hot paths after first load. */
let syncCache: AiPlatformToggles | null = null;
let syncCacheAt = 0;
const SYNC_CACHE_MS = 3000;

async function cachedConfig(): Promise<AiPlatformToggles> {
  const now = Date.now();
  if (syncCache && now - syncCacheAt < SYNC_CACHE_MS) return syncCache;
  syncCache = await getAiPlatformConfig();
  syncCacheAt = now;
  return syncCache;
}

export function invalidateAiRuntimeCache() {
  syncCache = null;
  syncCacheAt = 0;
}

export async function isMemoryRuntimeEnabled(): Promise<boolean> {
  return isAiFeatureEnabled("memory");
}

export async function isAutomationRuntimeEnabled(): Promise<boolean> {
  return isAiFeatureEnabled("automations");
}

export async function isRagRuntimeEnabled(): Promise<boolean> {
  return isAiFeatureEnabled("rag");
}

export async function isToolCallingRuntimeEnabled(): Promise<boolean> {
  return isAiFeatureEnabled("toolCalling");
}

export async function isVoiceRuntimeEnabled(): Promise<boolean> {
  return isAiFeatureEnabled("voice");
}

export async function isStreamingRuntimeEnabled(): Promise<boolean> {
  return isAiFeatureEnabled("streaming");
}

/** Fast sync variant for memory — falls back to env if cache cold. */
export function isMemoryEnabledSync(): boolean {
  if (!envAllows(process.env.AI_MEMORY_ENABLED)) return false;
  if (syncCache) {
    if (!syncCache.aiMasterEnabled) return false;
    return syncCache.memoryEnabled;
  }
  return process.env.AI_MEMORY_ENABLED !== "false";
}

export function isAutomationEnabledSync(): boolean {
  if (!envAllows(process.env.AI_AUTOMATION_ENABLED)) return false;
  if (syncCache) {
    if (!syncCache.aiMasterEnabled) return false;
    return syncCache.automationsEnabled;
  }
  return process.env.AI_AUTOMATION_ENABLED !== "false";
}

function syncToggle(key: AiFeatureKey, envKey: string | undefined): boolean {
  if (!envAllows(envKey)) return false;
  if (syncCache) {
    if (!syncCache.aiMasterEnabled && key !== "master") return false;
    return dbToggle(syncCache, key);
  }
  return envKey !== "false";
}

export function isMasterEnabledSync(): boolean {
  return syncToggle("master", process.env.AI_MASTER_ENABLED);
}

export function isRagEnabledSync(): boolean {
  return syncToggle("rag", process.env.AI_RAG_ENABLED);
}

export function isVectorDbEnabledSync(): boolean {
  return syncToggle("vectorDb", process.env.AI_VECTOR_DB_ENABLED);
}

export function isToolCallingEnabledSync(): boolean {
  return syncToggle("toolCalling", process.env.AI_TOOL_CALLING_ENABLED);
}

export function isStreamingEnabledSync(): boolean {
  return syncToggle("streaming", process.env.AI_STREAMING_ENABLED);
}

export function isVoiceEnabledSync(): boolean {
  return syncToggle("voice", process.env.AI_VOICE_ENABLED);
}

export function isMultiAgentEnabledSync(): boolean {
  return syncToggle("multiAgent", process.env.AI_MULTI_AGENT_ENABLED);
}

/** Warm cache on module load in server context. */
void cachedConfig().catch(() => undefined);

export function isWebSearchAvailable(): boolean {
  return Boolean(process.env.TAVILY_API_KEY?.trim() || process.env.SERPER_API_KEY?.trim());
}

export function isMultiAgentAvailable(): boolean {
  return process.env.AI_MULTI_AGENT_AVAILABLE === "true";
}
