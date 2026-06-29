import { prisma } from "@/lib/db/prisma";
import {
  DEFAULT_MODEL,
  MAX_TOKENS,
  TEMPERATURE,
} from "@/lib/ai/chat-core";
import { ensureDefaultAgentsForTenant } from "@/lib/ai/control-center/seed-agents";
import {
  getAiPlatformConfig,
  type AiPlatformToggles,
} from "@/lib/db/repositories/ai-platform-config.repository";
import { routeContextToAgentSlug, routeContextToModule } from "@/lib/ai/runtime/agent-router";
import { resolvePromptsForAgent } from "@/lib/ai/runtime/prompt-resolver";
import type { ResolvedAgentRuntime } from "@/lib/ai/runtime/types";

function envFallback(): Omit<ResolvedAgentRuntime, "tenantId" | "agentId" | "agentSlug" | "agentName" | "module"> {
  return {
    provider: "openai",
    model: DEFAULT_MODEL,
    prompt: "",
    systemPrompt: "",
    temperature: TEMPERATURE,
    maxTokens: MAX_TOKENS,
    memoryEnabled: true,
    ragEnabled: true,
    vectorEnabled: true,
    toolCallingEnabled: true,
    streamingEnabled: true,
    webSearchEnabled: false,
    schedulerEnabled: false,
    active: true,
  };
}

function mergePlatformToggles(
  agent: {
    memoryEnabled: boolean;
    ragEnabled: boolean;
    vectorEnabled: boolean;
    toolCallingEnabled: boolean;
    streamingEnabled: boolean;
    webSearchEnabled: boolean;
    schedulerEnabled: boolean;
    active: boolean;
  },
  platform: AiPlatformToggles,
) {
  const master = platform.aiMasterEnabled;
  return {
    memoryEnabled: master && platform.memoryEnabled && agent.memoryEnabled,
    ragEnabled: master && platform.ragEnabled && agent.ragEnabled,
    vectorEnabled: master && platform.vectorDbEnabled && agent.vectorEnabled,
    toolCallingEnabled: master && platform.toolCallingEnabled && agent.toolCallingEnabled,
    streamingEnabled: master && platform.streamingEnabled && agent.streamingEnabled,
    webSearchEnabled: master && platform.webSearchEnabled && agent.webSearchEnabled,
    schedulerEnabled: master && platform.schedulerEnabled && agent.schedulerEnabled,
    active: master && agent.active,
  };
}

function rowToRuntime(
  row: {
    id: string;
    slug: string;
    name: string;
    module: string;
    provider: string;
    model: string;
    prompt: string;
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
    memoryEnabled: boolean;
    ragEnabled: boolean;
    vectorEnabled: boolean;
    toolCallingEnabled: boolean;
    streamingEnabled: boolean;
    webSearchEnabled: boolean;
    schedulerEnabled: boolean;
    active: boolean;
  },
  tenantId: string,
  platform: AiPlatformToggles,
): ResolvedAgentRuntime {
  const toggles = mergePlatformToggles(row, platform);
  return {
    agentId: row.id,
    agentSlug: row.slug,
    agentName: row.name,
    tenantId,
    module: row.module,
    provider: row.provider,
    model: row.model,
    prompt: row.prompt,
    systemPrompt: row.systemPrompt,
    temperature: row.temperature,
    maxTokens: row.maxTokens,
    ...toggles,
  };
}

/**
 * Loads agent config fresh from DB on every call — panel edits apply on next request.
 * Falls back to OPENAI_MODEL env only when no AiAgent row exists for the tenant.
 */
export async function resolveAgentRuntime(
  tenantId: string,
  context: string,
): Promise<ResolvedAgentRuntime> {
  const [platform, slug, agentModule] = await Promise.all([
    getAiPlatformConfig(),
    routeContextToAgentSlug(tenantId, context),
    routeContextToModule(tenantId, context),
  ]);

  let row = await prisma.aiAgent.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
  });

  if (!row) {
    try {
      await ensureDefaultAgentsForTenant(tenantId);
    } catch {
      /* tenant assente (test) o DB non migrato */
    }
    row = await prisma.aiAgent.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
    });
  }

  if (!row) {
    const byModule = await prisma.aiAgent.findFirst({
      where: { tenantId, module: agentModule, active: true },
      orderBy: { updatedAt: "desc" },
    });
    if (byModule) return rowToRuntime(byModule, tenantId, platform);

    const anyAgent = await prisma.aiAgent.findFirst({
      where: { tenantId, active: true },
      orderBy: { updatedAt: "desc" },
    });
    if (anyAgent) return rowToRuntime(anyAgent, tenantId, platform);

    const fb = envFallback();
    return {
      agentId: null,
      agentSlug: slug,
      agentName: slug,
      tenantId,
      module: agentModule,
      ...fb,
      ...mergePlatformToggles(
        {
          memoryEnabled: true,
          ragEnabled: true,
          vectorEnabled: true,
          toolCallingEnabled: true,
          streamingEnabled: true,
          webSearchEnabled: false,
          schedulerEnabled: false,
          active: true,
        },
        platform,
      ),
    };
  }

  return rowToRuntime(row, tenantId, platform);
}

export async function resolveAgentWithPrompts(tenantId: string, context: string) {
  const runtime = await resolveAgentRuntime(tenantId, context);
  const prompts = await resolvePromptsForAgent(runtime);
  return { runtime, prompts };
}
