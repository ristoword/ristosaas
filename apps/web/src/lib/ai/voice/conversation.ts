import type { AiMessage } from "@/lib/ai/chat-core";
import {
  appendVoiceTurn,
  createVoiceSession,
  getVoiceHistory,
  getVoiceSession,
} from "@/lib/ai/voice/memory";
import type { OrchestratorModuleId } from "@/lib/ai/orchestrator/types";
import type { VoiceSession, VoiceTurn } from "@/lib/ai/voice/types";
import { VOICE_MAX_HISTORY_TURNS } from "@/lib/ai/voice/types";

export class VoiceConversation {
  readonly sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  static start(params: { tenantId: string; userId: string; locale?: string }): VoiceConversation {
    const session = createVoiceSession(params);
    return new VoiceConversation(session.id);
  }

  static resume(sessionId: string): VoiceConversation | null {
    const session = getVoiceSession(sessionId);
    if (!session) return null;
    return new VoiceConversation(session.id);
  }

  getSession(): VoiceSession | null {
    return getVoiceSession(this.sessionId);
  }

  addUserMessage(content: string): VoiceSession | null {
    return appendVoiceTurn(this.sessionId, {
      role: "user",
      content: content.trim(),
      ts: Date.now(),
    });
  }

  addAssistantMessage(
    content: string,
    meta?: { actions?: string[]; modulesUsed?: OrchestratorModuleId[] },
  ): VoiceSession | null {
    return appendVoiceTurn(this.sessionId, {
      role: "assistant",
      content: content.trim(),
      ts: Date.now(),
      actions: meta?.actions,
      modulesUsed: meta?.modulesUsed,
    });
  }

  getTurns(limit = VOICE_MAX_HISTORY_TURNS): VoiceTurn[] {
    return getVoiceHistory(this.sessionId, limit);
  }

  toAiHistory(limit = VOICE_MAX_HISTORY_TURNS): AiMessage[] {
    return this.getTurns(limit)
      .filter((t) => t.content.trim())
      .map((t) => ({ role: t.role, content: t.content }));
  }
}

export function createConversation(params: {
  tenantId: string;
  userId: string;
  locale?: string;
  sessionId?: string;
}): VoiceConversation | null {
  if (params.sessionId) {
    return VoiceConversation.resume(params.sessionId);
  }
  return VoiceConversation.start({
    tenantId: params.tenantId,
    userId: params.userId,
    locale: params.locale,
  });
}
