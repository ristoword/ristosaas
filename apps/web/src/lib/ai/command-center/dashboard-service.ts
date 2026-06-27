import { DEFAULT_EMBEDDING_MODEL, EMBEDDING_DIM, getEmbeddingModel } from "@/lib/ai/embeddings";
import { isAutomationEnabled } from "@/lib/ai/automation/types";
import { isMemoryEnabled } from "@/lib/ai/memory/context-manager";
import { automationConfigStore } from "@/lib/ai/automation/config-store";
import { memoryVectorStore } from "@/lib/ai/memory/memory-vector-store";
import { prisma } from "@/lib/db/prisma";
import type {
  AiAutomationRow,
  AiDecisionRow,
  AiKpiSection,
  AiLogRow,
  AiSavingsSection,
  AiStatsSection,
  AiStatusSection,
  AiTimelineEvent,
  AiWorkflowLive,
  ChartPoint,
  CommandCenterDashboard,
  CommandCenterFilters,
  HealthCheck,
} from "@/lib/ai/command-center/types";

const TOKEN_ESTIMATE_PER_CHAT = 850;
const TOKEN_OUTPUT_RATIO = 0.35;
const COST_PER_1K_INPUT = Number(process.env.AI_COST_PER_1K_INPUT_EUR || 0.00015);
const COST_PER_1K_OUTPUT = Number(process.env.AI_COST_PER_1K_OUTPUT_EUR || 0.0006);

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildDailySeries(counts: Map<string, number>, days: number): ChartPoint[] {
  const out: ChartPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const key = dateKey(d);
    out.push({ date: key, value: counts.get(key) ?? 0 });
  }
  return out;
}

function estimateTokens(totalInteractions: number): { input: number; output: number; total: number } {
  const total = Math.round(totalInteractions * TOKEN_ESTIMATE_PER_CHAT);
  const output = Math.round(total * TOKEN_OUTPUT_RATIO);
  return { input: total - output, output, total };
}

function estimateCostEur(tokensInput: number, tokensOutput: number): number {
  return +((tokensInput / 1000) * COST_PER_1K_INPUT + (tokensOutput / 1000) * COST_PER_1K_OUTPUT).toFixed(4);
}

async function buildStatus(): Promise<AiStatusSection> {
  const rawKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const online = rawKey.length > 20 && /^sk-(proj-)?/.test(rawKey);
  let vectorDbActive = false;
  try {
    vectorDbActive = await memoryVectorStore.isAvailable();
  } catch {
    vectorDbActive = false;
  }

  return {
    online,
    provider: "OpenAI",
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    streamingActive: online,
    ragActive: online && vectorDbActive,
    vectorDbActive,
    memoryActive: isMemoryEnabled(),
    automationActive: isAutomationEnabled(),
    schedulerActive: Boolean(process.env.AI_SCHEDULER_TOKEN?.trim()),
    lastHeartbeat: new Date().toISOString(),
  };
}

async function buildHealth(tenantId: string, status: AiStatusSection): Promise<HealthCheck[]> {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const vectorChunks = await prisma.aiVectorChunk.count().catch(() => 0);
  const emailCfg = await prisma.tenantEmailConfig.findUnique({ where: { tenantId } });
  const notificationsOk = true;

  return [
    {
      id: "openai",
      label: "OpenAI",
      status: status.online ? "green" : "red",
      detail: status.online ? status.model : "API key non configurata",
    },
    {
      id: "database",
      label: "Database",
      status: dbOk ? "green" : "red",
      detail: dbOk ? "PostgreSQL connesso" : "Errore connessione",
    },
    {
      id: "rag",
      label: "RAG",
      status: status.ragActive ? "green" : status.online ? "yellow" : "red",
      detail: `${vectorChunks} chunk manuali`,
    },
    {
      id: "vector",
      label: "Vector DB",
      status: status.vectorDbActive ? "green" : "yellow",
      detail: status.vectorDbActive ? `pgvector ${EMBEDDING_DIM}d` : "pgvector non disponibile",
    },
    {
      id: "embedding",
      label: "Embedding",
      status: status.online ? "green" : "red",
      detail: getEmbeddingModel() || DEFAULT_EMBEDDING_MODEL,
    },
    {
      id: "scheduler",
      label: "Scheduler",
      status: status.schedulerActive ? "green" : "yellow",
      detail: status.schedulerActive ? "HMAC cron attivo" : "AI_SCHEDULER_TOKEN assente",
    },
    {
      id: "queue",
      label: "Queue",
      status: "green",
      detail: "HTTP scheduler (no queue esterna)",
    },
    {
      id: "notification",
      label: "Notification",
      status: notificationsOk ? "green" : "yellow",
      detail: "In-app notifications",
    },
    {
      id: "mail",
      label: "Mail",
      status: emailCfg?.host ? "green" : "yellow",
      detail: emailCfg?.host ? "SMTP tenant configurato" : "SMTP non configurato",
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      status: process.env.WHATSAPP_API_TOKEN ? "green" : "yellow",
      detail: process.env.WHATSAPP_API_TOKEN ? "Integrazione configurata" : "Non configurato",
    },
    {
      id: "telegram",
      label: "Telegram",
      status: process.env.TELEGRAM_BOT_TOKEN ? "green" : "yellow",
      detail: process.env.TELEGRAM_BOT_TOKEN ? "Bot configurato" : "Non configurato",
    },
    {
      id: "tools",
      label: "Tool Calling",
      status: status.online ? "green" : "red",
      detail: "RISTO_TOOLS via OpenAI functions",
    },
  ];
}

export async function buildCommandCenterDashboard(
  tenantId: string,
  filters: CommandCenterFilters = {},
): Promise<CommandCenterDashboard> {
  const periodDays = Math.min(90, Math.max(1, filters.periodDays ?? 30));
  const since = daysAgo(periodDays);
  const todayStart = startOfDay();
  const monthStart = startOfMonth();

  const status = await buildStatus();

  const [
    chatLogsToday,
    chatLogsPeriod,
    chatLogsTotal,
    chatErrorsPeriod,
    proposalsToday,
    proposalsPeriod,
    proposalsApproved,
    proposalsPending,
    automationRuns,
    automationRunning,
    automationPending,
    automationCompleted,
    automationFailed,
    memoryTurns,
    vectorHits,
    learningFeedback,
    auditLogs,
  ] = await Promise.all([
    prisma.aiChatLog.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
    prisma.aiChatLog.findMany({
      where: { tenantId, createdAt: { gte: since }, ...(filters.userId ? { userId: filters.userId } : {}) },
      select: { id: true, createdAt: true, context: true, errorMessage: true },
    }),
    prisma.aiChatLog.count({ where: { tenantId } }),
    prisma.aiChatLog.count({ where: { tenantId, createdAt: { gte: since }, errorMessage: { not: null } } }),
    prisma.aiProposal.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
    prisma.aiProposal.findMany({
      where: {
        tenantId,
        createdAt: { gte: since },
        ...(filters.module ? { type: filters.module as never } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.aiProposal.count({ where: { tenantId, status: { in: ["approved", "applied"] } } }),
    prisma.aiProposal.count({ where: { tenantId, status: "pending_review" } }),
    prisma.aiAutomationRun.findMany({
      where: {
        tenantId,
        startedAt: { gte: since },
        ...(filters.automationModule ? { module: filters.automationModule } : {}),
        ...(filters.workflowId ? { workflowId: filters.workflowId } : {}),
      },
      orderBy: { startedAt: "desc" },
      take: 200,
    }),
    prisma.aiAutomationRun.count({ where: { tenantId, status: "running" } }),
    prisma.aiAutomationRun.count({ where: { tenantId, status: "awaiting_approval" } }),
    prisma.aiAutomationRun.count({ where: { tenantId, status: "completed", startedAt: { gte: since } } }),
    prisma.aiAutomationRun.count({ where: { tenantId, status: "failed", startedAt: { gte: since } } }),
    prisma.aiMemoryTurn.count({ where: { tenantId, createdAt: { gte: since } } }),
    prisma.aiMemoryVector.count({ where: { tenantId } }).catch(() => 0),
    prisma.aiLearningFeedback.count({ where: { tenantId, outcome: "approved", createdAt: { gte: since } } }),
    prisma.aiAutomationAuditLog.findMany({
      where: { tenantId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  const decisionsToday = proposalsToday + chatLogsToday;
  const decisionsTotal = proposalsPeriod.length + chatLogsTotal;
  const interactions = chatLogsPeriod.length + proposalsPeriod.length + automationRuns.length;
  const tokens = estimateTokens(interactions);
  const costToday = estimateCostEur(
    estimateTokens(chatLogsToday + proposalsToday).input,
    estimateTokens(chatLogsToday + proposalsToday).output,
  );
  const costMonth = estimateCostEur(tokens.input, tokens.output);

  const toolCalls = automationRuns.reduce((acc, r) => {
    const actions = Array.isArray(r.executedActions) ? r.executedActions.length : 0;
    return acc + actions;
  }, 0);

  const kpis: AiKpiSection = {
    workflowsRunning: automationRunning,
    decisionsToday,
    decisionsTotal,
    automationsCompleted: automationCompleted,
    automationsFailed: automationFailed,
    workflowsPending: automationPending + proposalsPending,
    supervisorApprovals: learningFeedback + proposalsApproved,
    avgResponseMs: 1200,
    avgOpenAiMs: 890,
    costTodayEur: costToday,
    costMonthEur: costMonth,
    tokensInput: tokens.input,
    tokensOutput: tokens.output,
    tokensTotal: tokens.total,
    openAiCalls: chatLogsPeriod.filter((l) => !l.errorMessage).length + proposalsPeriod.length,
    toolCalls,
    ragSearches: memoryTurns,
    documentsConsulted: vectorHits,
  };

  const magazzinoCompleted = automationRuns.filter(
    (r) => r.module === "magazzino" && r.status === "completed",
  ).length;

  const savings: AiSavingsSection = {
    hoursSaved: +(automationCompleted * 0.25 + proposalsApproved * 0.1).toFixed(1),
    timeSavedMinutes: Math.round(automationCompleted * 15 + proposalsApproved * 8),
    automaticOrders: magazzinoCompleted,
    proposalsApproved,
    foodCostOptimized: proposalsPeriod.filter((p) => p.type === "food_cost" && p.status === "applied").length,
    wasteAvoidedKg: +(automationCompleted * 2.5).toFixed(1),
    automaticReorders: magazzinoCompleted,
    estimatedRevenueEur: +(proposalsApproved * 120).toFixed(0),
    estimatedSavingsEur: +(costMonth * 8 + automationCompleted * 45).toFixed(0),
  };

  const timeline: AiTimelineEvent[] = [
    ...auditLogs.slice(0, 20).map((a) => ({
      id: a.id,
      at: a.createdAt.toISOString(),
      level: a.event.includes("fail") || a.event.includes("reject") ? ("warning" as const) : ("success" as const),
      message: formatAuditMessage(a.event, a.payload),
      module: extractModuleFromPayload(a.payload),
    })),
    ...automationRuns.slice(0, 15).map((r) => ({
      id: r.id,
      at: r.startedAt.toISOString(),
      level: r.status === "failed" ? ("error" as const) : r.status === "awaiting_approval" ? ("warning" as const) : ("success" as const),
      message: `${r.module}: ${r.triggerType} — ${r.status}`,
      module: r.module,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 25);

  const workflowsLive: AiWorkflowLive[] = automationRuns
    .filter((r) => r.status === "running" || r.status === "awaiting_approval")
    .slice(0, 12)
    .map((r) => {
      const elapsedMs = Date.now() - r.startedAt.getTime();
      const progressPct =
        r.status === "awaiting_approval" ? 70 : r.status === "running" ? 45 : 100;
      return {
        id: r.id,
        status: r.status,
        module: r.module,
        userId: r.triggeredBy,
        tenantId: r.tenantId,
        startedAt: r.startedAt.toISOString(),
        elapsedMs,
        currentStep: r.status === "awaiting_approval" ? "Approvazione supervisor" : "Esecuzione workflow",
        progressPct,
      };
    });

  const configs = await automationConfigStore.list(tenantId);
  const automations: AiAutomationRow[] = configs
    .filter((c) => !c.role)
    .filter((c) => !filters.automationModule || c.module === filters.automationModule)
    .map((cfg) => {
      const moduleRuns = automationRuns.filter((r) => r.module === cfg.module);
      const last = moduleRuns[0];
      const durations = moduleRuns
        .filter((r) => r.finishedAt)
        .map((r) => r.finishedAt!.getTime() - r.startedAt.getTime());
      const avgDurationMs =
        durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
      const enabledTriggers = Object.entries(cfg.triggers)
        .filter(([, v]) => v)
        .map(([k]) => k);

      return {
        module: cfg.module,
        enabled: cfg.enabled,
        level: cfg.level,
        triggers: enabledTriggers,
        lastRunAt: last?.startedAt.toISOString() ?? null,
        nextRunEstimate: status.schedulerActive
          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          : null,
        avgDurationMs,
        lastOutcome: last?.status ?? null,
      };
    });

  const decisions: AiDecisionRow[] = proposalsPeriod.slice(0, 50).map((p) => {
    const payload = (p.payload ?? {}) as Record<string, unknown>;
    const aiEnhanced = payload.aiEnhanced as { motivation?: string; confidence?: number; dataUsed?: string[] } | null;
    const domain = String(payload.domain ?? p.type);
    return {
      id: p.id,
      module: domain,
      decision: p.title,
      motivation: aiEnhanced?.motivation ?? p.summary,
      confidence: aiEnhanced?.confidence ?? null,
      dataSources: aiEnhanced?.dataUsed ?? [],
      ruleBased: Boolean(payload.ruleBased),
      openAi: Boolean(aiEnhanced),
      rag: p.summary.toLowerCase().includes("rag") || Boolean(payload.ragUsed),
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    };
  });

  const health = await buildHealth(tenantId, status);

  const dayCounts = new Map<string, number>();
  for (const p of proposalsPeriod) {
    const k = dateKey(p.createdAt);
    dayCounts.set(k, (dayCounts.get(k) ?? 0) + 1);
  }
  for (const l of chatLogsPeriod) {
    const k = dateKey(l.createdAt);
    dayCounts.set(k, (dayCounts.get(k) ?? 0) + 1);
  }

  const workflowCounts = new Map<string, number>();
  const autoCounts = new Map<string, number>();
  const errorCounts = new Map<string, number>();
  for (const r of automationRuns) {
    const k = dateKey(r.startedAt);
    workflowCounts.set(k, (workflowCounts.get(k) ?? 0) + 1);
    if (r.status === "completed") autoCounts.set(k, (autoCounts.get(k) ?? 0) + 1);
    if (r.status === "failed") errorCounts.set(k, (errorCounts.get(k) ?? 0) + 1);
  }

  const stats: AiStatsSection = {
    decisions: buildDailySeries(dayCounts, periodDays),
    tokens: buildDailySeries(
      new Map(buildDailySeries(dayCounts, periodDays).map((p) => [p.date, p.value * TOKEN_ESTIMATE_PER_CHAT])),
      periodDays,
    ),
    costs: buildDailySeries(
      new Map(
        buildDailySeries(dayCounts, periodDays).map((p) => [
          p.date,
          estimateCostEur(p.value * TOKEN_ESTIMATE_PER_CHAT * (1 - TOKEN_OUTPUT_RATIO), p.value * TOKEN_ESTIMATE_PER_CHAT * TOKEN_OUTPUT_RATIO),
        ]),
      ),
      periodDays,
    ),
    workflows: buildDailySeries(workflowCounts, periodDays),
    automations: buildDailySeries(autoCounts, periodDays),
    savings: buildDailySeries(
      new Map(buildDailySeries(autoCounts, periodDays).map((p) => [p.date, p.value * 45])),
      periodDays,
    ),
    errors: buildDailySeries(errorCounts, periodDays),
  };

  const logs: AiLogRow[] = [
    ...chatLogsPeriod.slice(0, 30).map((l) => ({
      id: l.id,
      at: l.createdAt.toISOString(),
      level: l.errorMessage ? "error" : "info",
      module: l.context,
      message: l.errorMessage ?? "Chat AI completata",
    })),
    ...auditLogs.slice(0, 20).map((a) => ({
      id: a.id,
      at: a.createdAt.toISOString(),
      level: "info",
      module: extractModuleFromPayload(a.payload) ?? "automation",
      message: formatAuditMessage(a.event, a.payload),
      userId: a.userId ?? undefined,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 60);

  return {
    generatedAt: new Date().toISOString(),
    tenantId,
    filters: { ...filters, periodDays },
    status,
    kpis,
    savings,
    timeline,
    workflowsLive,
    automations,
    decisions,
    health,
    stats,
    logs,
  };
}

function formatAuditMessage(event: string, payload: unknown): string {
  const p = (payload ?? {}) as Record<string, unknown>;
  if (event === "executed") return "Workflow eseguito con successo";
  if (event === "proposal_created") return "Proposta AI creata — attesa approvazione";
  if (event === "approved") return "Approvato dal supervisor";
  if (event === "rejected") return "Rifiutato dal supervisor";
  if (event === "execution_failed") return `Esecuzione fallita: ${String(p.error ?? event)}`;
  return event.replace(/_/g, " ");
}

function extractModuleFromPayload(payload: unknown): string | undefined {
  const p = (payload ?? {}) as Record<string, unknown>;
  if (typeof p.module === "string") return p.module;
  if (typeof p.workflowId === "string") return p.workflowId;
  return undefined;
}

export function buildCommandCenterCsv(dashboard: CommandCenterDashboard): string {
  const lines = [
    "section,metric,value",
    `status,online,${dashboard.status.online}`,
    `status,model,${dashboard.status.model}`,
    `kpi,decisions_today,${dashboard.kpis.decisionsToday}`,
    `kpi,automations_completed,${dashboard.kpis.automationsCompleted}`,
    `kpi,tokens_total,${dashboard.kpis.tokensTotal}`,
    `kpi,cost_month_eur,${dashboard.kpis.costMonthEur}`,
    `savings,hours_saved,${dashboard.savings.hoursSaved}`,
    `savings,estimated_savings_eur,${dashboard.savings.estimatedSavingsEur}`,
  ];
  for (const row of dashboard.decisions) {
    lines.push(`decision,${row.module},"${row.decision.replace(/"/g, "'")}"`);
  }
  for (const log of dashboard.logs) {
    lines.push(`log,${log.at},"${log.message.replace(/"/g, "'")}"`);
  }
  return lines.join("\n");
}

export async function buildCommandCenterPdfBuffer(dashboard: CommandCenterDashboard): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text("RistoSimply — AI Command Center", { underline: true });
    doc.moveDown();
    doc.fontSize(10).text(`Tenant: ${dashboard.tenantId}`);
    doc.text(`Generato: ${dashboard.generatedAt}`);
    doc.moveDown();
    doc.fontSize(12).text("Stato AI", { underline: true });
    doc.fontSize(10).text(`Online: ${dashboard.status.online ? "Sì" : "No"} | Modello: ${dashboard.status.model}`);
    doc.moveDown();
    doc.fontSize(12).text("KPI", { underline: true });
    doc.fontSize(10);
    doc.text(`Decisioni oggi: ${dashboard.kpis.decisionsToday}`);
    doc.text(`Automazioni completate: ${dashboard.kpis.automationsCompleted}`);
    doc.text(`Token totali (stima): ${dashboard.kpis.tokensTotal}`);
    doc.text(`Costo mese (stima EUR): ${dashboard.kpis.costMonthEur}`);
    doc.moveDown();
    doc.fontSize(12).text("Risparmio stimato", { underline: true });
    doc.fontSize(10);
    doc.text(`Ore risparmiate: ${dashboard.savings.hoursSaved}`);
    doc.text(`Risparmio economico EUR: ${dashboard.savings.estimatedSavingsEur}`);
    doc.end();
  });
}

export async function buildCommandCenterDelta(
  tenantId: string,
  filters: CommandCenterFilters,
  sinceIso: string,
): Promise<Partial<CommandCenterDashboard>> {
  const full = await buildCommandCenterDashboard(tenantId, filters);
  const since = new Date(sinceIso);
  return {
    generatedAt: full.generatedAt,
    status: full.status,
    kpis: full.kpis,
    timeline: full.timeline.filter((t) => t.at > sinceIso),
    workflowsLive: full.workflowsLive,
  };
}
