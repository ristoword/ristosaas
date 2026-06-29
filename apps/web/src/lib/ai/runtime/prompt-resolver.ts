import { prisma } from "@/lib/db/prisma";
import type { ResolvedAgentRuntime } from "@/lib/ai/runtime/types";

export type ResolvedPrompts = {
  systemPrompt: string;
  userPrompt: string;
  promptTemplateId: string | null;
  promptVersion: number | null;
  source: "prompt_manager" | "agent_db" | "legacy";
};

/**
 * Prompt Manager is the official source when a template exists for the agent/module.
 */
export async function resolvePromptsForAgent(
  agent: Pick<ResolvedAgentRuntime, "tenantId" | "agentSlug" | "module" | "systemPrompt" | "prompt">,
): Promise<ResolvedPrompts> {
  const template = await prisma.aiPromptTemplate.findFirst({
    where: {
      active: true,
      OR: [
        { tenantId: agent.tenantId, key: agent.agentSlug },
        { tenantId: null, key: agent.agentSlug },
        { tenantId: agent.tenantId, key: `agent.${agent.agentSlug}` },
        { tenantId: null, key: `agent.${agent.agentSlug}` },
        { tenantId: agent.tenantId, module: agent.module },
      ],
    },
    orderBy: [{ tenantId: "desc" }, { updatedAt: "desc" }],
  });

  if (template?.systemPrompt?.trim() || template?.content?.trim()) {
    return {
      systemPrompt: template.systemPrompt.trim() || agent.systemPrompt,
      userPrompt: template.content.trim() || agent.prompt,
      promptTemplateId: template.id,
      promptVersion: template.version,
      source: "prompt_manager",
    };
  }

  if (agent.systemPrompt.trim() || agent.prompt.trim()) {
    return {
      systemPrompt: agent.systemPrompt,
      userPrompt: agent.prompt,
      promptTemplateId: null,
      promptVersion: null,
      source: "agent_db",
    };
  }

  return {
    systemPrompt: "",
    userPrompt: "",
    promptTemplateId: null,
    promptVersion: null,
    source: "legacy",
  };
}
