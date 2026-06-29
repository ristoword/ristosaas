import { DEFAULT_EMBEDDING_MODEL, EMBEDDING_DIM, getEmbeddingModel } from "@/lib/ai/embeddings";
import { buildManualChunks } from "@/lib/ai/rag";
import { RISTO_TOOLS } from "@/lib/ai/risto-tools";
import {
  getAiPlatformConfig,
  type AiPlatformToggles,
} from "@/lib/db/repositories/ai-platform-config.repository";
import { aiVectorRepository } from "@/lib/db/repositories/ai-vector.repository";
import { memoryVectorStore } from "@/lib/ai/memory/memory-vector-store";
import { purgeExpiredVoiceSessions } from "@/lib/ai/voice/memory";
import {
  isMultiAgentAvailable,
  isWebSearchAvailable,
} from "@/lib/ai/platform-config.runtime";
import { prisma } from "@/lib/db/prisma";

export type HealthStatus = "green" | "yellow" | "red";

export type AiConfigCenterPayload = {
  toggles: AiPlatformToggles;
  rag: RagCenterSection;
  vector: VectorDbSection;
  tools: ToolCallingSection;
  memory: MemorySection;
  streaming: StreamingSection;
  voice: VoiceSection;
  automation: AutomationSection;
  webSearch: WebSearchSection | null;
  multiAgent: MultiAgentSection | null;
  health: HealthService[];
  logs: AiSystemLogEntry[];
  meta: {
    serverStartedAt: string;
    lastDeployAt: string | null;
    openAiConfigured: boolean;
    readOnly: boolean;
  };
};

export type RagCenterSection = {
  status: "disabled" | "indexing" | "ready" | "error";
  documentsIndexed: number;
  chunksCreated: number;
  embeddingsGenerated: number;
  lastSyncAt: string | null;
  avgIndexMs: number | null;
  avgSearchMs: number | null;
  indexSizeBytes: number;
  errorDocuments: number;
  lastUpdated: string | null;
  lastError: string | null;
};

export type VectorDbSection = {
  activeProvider: string;
  supportedProviders: string[];
  connectionStatus: HealthStatus;
  latencyMs: number | null;
  embeddingCount: number;
  indexSizeBytes: number;
  diskUsageBytes: number;
  lastUpdated: string | null;
  avgSearchMs: number | null;
  providerVersion: string | null;
  healthCheck: HealthStatus;
  detail: string;
};

export type ToolCallingSection = {
  status: HealthStatus;
  registeredCount: number;
  availableTools: string[];
  disabledTools: string[];
  usedToday: number;
  lastCallAt: string | null;
  errorsToday: number;
};

export type MemorySection = {
  status: HealthStatus;
  active: boolean;
  indexedConversations: number;
  memoryVectors: number;
  profiles: number;
  storageBytes: number;
  lastSaveAt: string | null;
  lastCleanupAt: string | null;
  retentionDays: number;
};

export type StreamingSection = {
  status: HealthStatus;
  activeConnections: number;
  avgResponseMs: number | null;
  throughputToday: number;
  errorsToday: number;
  lastHeartbeat: string;
};

export type VoiceSection = {
  status: HealthStatus;
  provider: string;
  microphone: "browser" | "unavailable";
  stt: string;
  tts: string;
  avgResponseMs: number | null;
  enabledLocales: string[];
  activeSessions: number;
};

export type AutomationSection = {
  schedulerActive: boolean;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  lastJobAt: string | null;
  nextScheduledAt: string | null;
};

export type WebSearchSection = {
  available: boolean;
  provider: string | null;
  status: HealthStatus;
  searchesToday: number;
  avgMs: number | null;
  errorsToday: number;
};

export type MultiAgentSection = {
  available: boolean;
  agentCount: number;
  activeAgents: number;
  inactiveAgents: number;
  routing: string;
  coordinationMs: number | null;
  orchestrationStatus: HealthStatus;
};

export type HealthService = {
  id: string;
  label: string;
  status: HealthStatus;
  detail: string;
};

export type AiSystemLogEntry = {
  id: string;
  level: "error" | "warning" | "info" | "event";
  message: string;
  module: string;
  at: string;
};

const globalForRagJob = globalThis as unknown as {
  ragIndexing?: { startedAt: number; error?: string };
  serverStartedAt?: number;
};

export function getRagIndexingState(): { indexing: boolean; error?: string } {
  const job = globalForRagJob.ragIndexing;
  if (!job) return { indexing: false };
  return { indexing: true, error: job.error };
}

export function setRagIndexing(active: boolean, error?: string) {
  if (!active) {
    globalForRagJob.ragIndexing = undefined;
    return;
  }
  globalForRagJob.ragIndexing = { startedAt: Date.now(), error };
}

function serverStartedAt(): string {
  if (!globalForRagJob.serverStartedAt) globalForRagJob.serverStartedAt = Date.now();
  return new Date(globalForRagJob.serverStartedAt).toISOString();
}

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function openAiOnline(): boolean {
  const rawKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  return rawKey.length > 20 && /^sk-(proj-)?/.test(rawKey);
}

const VECTOR_PROVIDERS = ["pgvector", "pinecone", "qdrant", "weaviate", "chroma", "milvus"];

export async function buildAiConfigCenter(readOnly = false): Promise<AiConfigCenterPayload> {
  const toggles = await getAiPlatformConfig();
  const todayStart = startOfDay();
  const rawKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const online = openAiOnline();

  const [
    vectorStats,
    vectorAvailable,
    memoryAvailable,
    chunkCount,
    memoryVectorCount,
    memoryProfileCount,
    memoryTurnCount,
    chatLogsToday,
    chatErrorsToday,
    automationRuns,
    automationActive,
    lastMemoryTurn,
    adminLogs,
    automationLogs,
  ] = await Promise.all([
    aiVectorRepository.getStats(),
    aiVectorRepository.isAvailable(),
    memoryVectorStore.isAvailable().catch(() => false),
    prisma.aiVectorChunk.count().catch(() => 0),
    prisma.aiMemoryVector.count().catch(() => 0),
    prisma.aiUserMemoryProfile.count().catch(() => 0),
    prisma.aiMemoryTurn.count().catch(() => 0),
    prisma.aiChatLog.count({ where: { createdAt: { gte: todayStart } } }).catch(() => 0),
    prisma.aiChatLog.count({ where: { createdAt: { gte: todayStart }, errorMessage: { not: null } } }).catch(() => 0),
    prisma.aiAutomationRun.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { startedAt: { gte: todayStart } },
    }).catch(() => []),
    prisma.aiAutomationRun.count({ where: { status: { in: ["pending", "running"] } } }).catch(() => 0),
    prisma.aiMemoryTurn.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }).catch(() => null),
    prisma.adminAuditLog.findMany({
      where: { action: { startsWith: "ai." } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }).catch(() => []),
    prisma.aiAutomationAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, event: true, createdAt: true, payload: true },
    }).catch(() => []),
  ]);

  const ragJob = getRagIndexingState();
  let ragStatus: RagCenterSection["status"] = "disabled";
  if (!toggles.ragEnabled || !toggles.aiMasterEnabled) ragStatus = "disabled";
  else if (ragJob.indexing) ragStatus = "indexing";
  else if (toggles.ragLastError) ragStatus = "error";
  else if (vectorAvailable && chunkCount > 0) ragStatus = "ready";
  else if (online) ragStatus = "ready";
  else ragStatus = "error";

  const manualChunks = buildManualChunks();
  const documentsIndexed = new Set(manualChunks.map((c) => c.sectionId)).size;

  const rag: RagCenterSection = {
    status: ragStatus,
    documentsIndexed: ragStatus === "ready" ? documentsIndexed : 0,
    chunksCreated: chunkCount,
    embeddingsGenerated: chunkCount,
    lastSyncAt: toggles.ragLastSyncAt,
    avgIndexMs: globalForRagJob.ragIndexing ? Date.now() - globalForRagJob.ragIndexing.startedAt : null,
    avgSearchMs: vectorStats.avgSearchMs,
    indexSizeBytes: vectorStats.totalBytes,
    errorDocuments: toggles.ragLastError ? 1 : 0,
    lastUpdated: vectorStats.lastUpdated,
    lastError: toggles.ragLastError,
  };

  let vectorLatency: number | null = null;
  let vectorHealth: HealthStatus = "red";
  if (vectorAvailable && toggles.vectorDbEnabled) {
    const t0 = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      vectorLatency = Date.now() - t0;
      vectorHealth = vectorLatency < 500 ? "green" : "yellow";
    } catch {
      vectorHealth = "red";
    }
  } else if (!toggles.vectorDbEnabled) {
    vectorHealth = "yellow";
  }

  const activeProvider = toggles.vectorProvider;
  const vector: VectorDbSection = {
    activeProvider,
    supportedProviders: VECTOR_PROVIDERS,
    connectionStatus: vectorAvailable && activeProvider === "pgvector" ? vectorHealth : activeProvider !== "pgvector" ? "red" : vectorHealth,
    latencyMs: vectorLatency,
    embeddingCount: vectorStats.chunkCount + memoryVectorCount,
    indexSizeBytes: vectorStats.totalBytes,
    diskUsageBytes: vectorStats.totalBytes,
    lastUpdated: vectorStats.lastUpdated,
    avgSearchMs: vectorStats.avgSearchMs,
    providerVersion: activeProvider === "pgvector" && vectorAvailable ? `pgvector ${EMBEDDING_DIM}d` : null,
    healthCheck: vectorHealth,
    detail:
      activeProvider === "pgvector"
        ? vectorAvailable
          ? `PostgreSQL + pgvector (${getEmbeddingModel() || DEFAULT_EMBEDDING_MODEL})`
          : "Estensione pgvector non installata"
        : `Provider ${activeProvider} non configurato — solo pgvector è attivo in questa installazione`,
  };

  const toolNames = RISTO_TOOLS.map((t) => t.function.name);
  const tools: ToolCallingSection = {
    status: online && toggles.toolCallingEnabled ? "green" : !toggles.toolCallingEnabled ? "yellow" : "red",
    registeredCount: toolNames.length,
    availableTools: toggles.toolCallingEnabled ? toolNames : [],
    disabledTools: toggles.toolCallingEnabled ? [] : toolNames,
    usedToday: 0,
    lastCallAt: null,
    errorsToday: 0,
  };

  // Tool usage from memory turns today
  const turnsToday = await prisma.aiMemoryTurn.findMany({
    where: { createdAt: { gte: todayStart } },
    select: { toolsUsed: true, createdAt: true },
    take: 500,
  }).catch(() => []);
  let toolCalls = 0;
  let lastToolAt: string | null = null;
  for (const turn of turnsToday) {
    const used = Array.isArray(turn.toolsUsed) ? (turn.toolsUsed as string[]) : [];
    if (used.length > 0) {
      toolCalls += used.length;
      if (!lastToolAt || turn.createdAt.toISOString() > lastToolAt) {
        lastToolAt = turn.createdAt.toISOString();
      }
    }
  }
  tools.usedToday = toolCalls;
  tools.lastCallAt = lastToolAt;

  const memoryBytes = await prisma.$queryRaw<Array<{ bytes: bigint }>>`
    SELECT COALESCE(SUM(octet_length(content)), 0)::bigint AS bytes FROM "AiMemoryVector"
  `.catch(() => [{ bytes: BigInt(0) }]);

  const memory: MemorySection = {
    status: toggles.memoryEnabled && memoryAvailable ? "green" : !toggles.memoryEnabled ? "yellow" : "red",
    active: toggles.memoryEnabled && toggles.aiMasterEnabled,
    indexedConversations: memoryTurnCount,
    memoryVectors: memoryVectorCount,
    profiles: memoryProfileCount,
    storageBytes: Number(memoryBytes[0]?.bytes ?? 0),
    lastSaveAt: lastMemoryTurn?.createdAt.toISOString() ?? null,
    lastCleanupAt: toggles.memoryLastCleanupAt,
    retentionDays: toggles.memoryRetentionDays,
  };

  purgeExpiredVoiceSessions();
  const voiceSessions = (globalThis as unknown as { voiceSessions?: Map<string, unknown> }).voiceSessions;

  const streaming: StreamingSection = {
    status: online && toggles.streamingEnabled ? "green" : !toggles.streamingEnabled ? "yellow" : "red",
    activeConnections: voiceSessions?.size ?? 0,
    avgResponseMs: null,
    throughputToday: chatLogsToday,
    errorsToday: chatErrorsToday,
    lastHeartbeat: new Date().toISOString(),
  };

  const voice: VoiceSection = {
    status: online && toggles.voiceAiEnabled ? "green" : !toggles.voiceAiEnabled ? "yellow" : "red",
    provider: "OpenAI",
    microphone: "browser",
    stt: "OpenAI Whisper",
    tts: "OpenAI TTS",
    avgResponseMs: null,
    enabledLocales: ["it", "en"],
    activeSessions: voiceSessions?.size ?? 0,
  };

  const completed = automationRuns.find((r) => r.status === "completed")?._count._all ?? 0;
  const failed = automationRuns.find((r) => r.status === "failed")?._count._all ?? 0;
  const lastRun = await prisma.aiAutomationRun.findFirst({
    orderBy: { startedAt: "desc" },
    select: { startedAt: true, finishedAt: true, status: true },
  }).catch(() => null);

  const automation: AutomationSection = {
    schedulerActive: toggles.schedulerEnabled && Boolean(process.env.AI_SCHEDULER_TOKEN?.trim()),
    activeJobs: automationActive,
    completedJobs: completed,
    failedJobs: failed,
    lastJobAt: lastRun?.finishedAt?.toISOString() ?? lastRun?.startedAt.toISOString() ?? null,
    nextScheduledAt: null,
  };

  const webSearchAvailable = isWebSearchAvailable();
  const webSearch: WebSearchSection | null = {
    available: webSearchAvailable,
    provider: process.env.TAVILY_API_KEY ? "Tavily" : process.env.SERPER_API_KEY ? "Serper" : null,
    status: webSearchAvailable && toggles.webSearchEnabled ? "green" : !webSearchAvailable ? "yellow" : "yellow",
    searchesToday: 0,
    avgMs: null,
    errorsToday: 0,
  };

  const multiAvailable = isMultiAgentAvailable();
  const multiAgent: MultiAgentSection | null = {
    available: multiAvailable,
    agentCount: multiAvailable ? 3 : 0,
    activeAgents: multiAvailable ? 2 : 0,
    inactiveAgents: multiAvailable ? 1 : 0,
    routing: multiAvailable ? "orchestrator" : "n/a",
    coordinationMs: null,
    orchestrationStatus: multiAvailable && toggles.multiAgentEnabled ? "green" : "yellow",
  };

  const health = await buildHealthCenter(toggles, online, vectorAvailable, memoryAvailable);

  const logs: AiSystemLogEntry[] = [
    ...adminLogs.map((l) => ({
      id: l.id,
      level: l.action.includes("error") ? ("error" as const) : ("event" as const),
      message: l.action,
      module: "admin",
      at: l.createdAt.toISOString(),
    })),
    ...automationLogs.map((l) => ({
      id: l.id,
      level: l.event.includes("error") || l.event.includes("fail") ? ("error" as const) : ("info" as const),
      message: l.event,
      module: "automation",
      at: l.createdAt.toISOString(),
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 50);

  return {
    toggles,
    rag,
    vector,
    tools,
    memory,
    streaming,
    voice,
    automation,
    webSearch: webSearchAvailable || toggles.webSearchEnabled ? webSearch : null,
    multiAgent: multiAvailable || toggles.multiAgentEnabled ? multiAgent : null,
    health,
    logs,
    meta: {
      serverStartedAt: serverStartedAt(),
      lastDeployAt: process.env.RAILWAY_DEPLOYMENT_ID ? new Date().toISOString() : null,
      openAiConfigured: online,
      readOnly,
    },
  };
}

async function buildHealthCenter(
  toggles: AiPlatformToggles,
  online: boolean,
  vectorAvailable: boolean,
  memoryAvailable: boolean,
): Promise<HealthService[]> {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const stripeOk = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  const redisConfigured = Boolean(process.env.REDIS_URL?.trim());
  const storageOk = Boolean(process.env.S3_BUCKET?.trim() || process.env.R2_BUCKET?.trim());

  return [
    {
      id: "openai",
      label: "OpenAI",
      status: online ? "green" : "red",
      detail: online ? (process.env.OPENAI_MODEL || "gpt-4o-mini") : "API key mancante o non valida",
    },
    {
      id: "database",
      label: "Database",
      status: dbOk ? "green" : "red",
      detail: dbOk ? "PostgreSQL connesso" : "Errore connessione",
    },
    {
      id: "redis",
      label: "Redis",
      status: redisConfigured ? "green" : "yellow",
      detail: redisConfigured ? "Redis configurato" : "Non configurato — rate limit su PostgreSQL",
    },
    {
      id: "rag",
      label: "RAG",
      status: toggles.ragEnabled && online ? (vectorAvailable ? "green" : "yellow") : "yellow",
      detail: toggles.ragEnabled ? `${await prisma.aiVectorChunk.count().catch(() => 0)} chunk` : "Disattivato",
    },
    {
      id: "vector",
      label: "Vector DB",
      status: vectorAvailable && toggles.vectorDbEnabled ? "green" : "yellow",
      detail: vectorAvailable ? toggles.vectorProvider : "pgvector non disponibile",
    },
    {
      id: "email",
      label: "Email",
      status: "yellow",
      detail: "SMTP per-tenant (TenantEmailConfig)",
    },
    {
      id: "storage",
      label: "Storage",
      status: storageOk ? "green" : "yellow",
      detail: storageOk ? "Object storage configurato" : "Storage locale / non configurato",
    },
    {
      id: "realtime",
      label: "Realtime",
      status: toggles.streamingEnabled ? "green" : "yellow",
      detail: toggles.streamingEnabled ? "SSE streaming attivo" : "Streaming disattivato",
    },
    {
      id: "scheduler",
      label: "Scheduler",
      status: toggles.schedulerEnabled && process.env.AI_SCHEDULER_TOKEN ? "green" : "yellow",
      detail: process.env.AI_SCHEDULER_TOKEN ? "HMAC cron" : "Token scheduler assente",
    },
    {
      id: "queue",
      label: "Queue",
      status: "green",
      detail: "HTTP scheduler (nessuna coda esterna)",
    },
    {
      id: "webhook",
      label: "Webhook",
      status: process.env.STRIPE_WEBHOOK_SECRET ? "green" : "yellow",
      detail: process.env.STRIPE_WEBHOOK_SECRET ? "Stripe webhook configurato" : "Webhook non configurato",
    },
    {
      id: "stripe",
      label: "Stripe",
      status: stripeOk ? "green" : "yellow",
      detail: stripeOk ? "Chiave API presente" : "STRIPE_SECRET_KEY assente",
    },
    {
      id: "memory",
      label: "Memory",
      status: toggles.memoryEnabled && memoryAvailable ? "green" : "yellow",
      detail: toggles.memoryEnabled ? "Memoria persistente attiva" : "Disattivata",
    },
  ];
}

export async function runRagReindex(apiKey: string): Promise<{ upserted: number; removed: number }> {
  setRagIndexing(true);
  try {
    const { embedTexts } = await import("@/lib/ai/embeddings");
    const chunks = buildManualChunks();
    const model = getEmbeddingModel();
    const result = await aiVectorRepository.forceReindex(chunks, model, (texts) => embedTexts(apiKey, texts));
    const { setRagSyncResult } = await import("@/lib/db/repositories/ai-platform-config.repository");
    await setRagSyncResult(new Date(), null);
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const { setRagSyncResult } = await import("@/lib/db/repositories/ai-platform-config.repository");
    await setRagSyncResult(new Date(), msg);
    throw e;
  } finally {
    setRagIndexing(false);
  }
}

export async function runRagClear(): Promise<number> {
  const removed = await aiVectorRepository.clearManualIndex();
  const { setRagSyncResult } = await import("@/lib/db/repositories/ai-platform-config.repository");
  await setRagSyncResult(new Date(), null);
  return removed;
}
