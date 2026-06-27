import { randomUUID } from "crypto";
import type { VoiceSession, VoiceTurn } from "@/lib/ai/voice/types";
import { VOICE_SESSION_TTL_MS } from "@/lib/ai/voice/types";

const globalForVoice = globalThis as unknown as {
  voiceSessions?: Map<string, VoiceSession>;
};

function store(): Map<string, VoiceSession> {
  if (!globalForVoice.voiceSessions) {
    globalForVoice.voiceSessions = new Map();
  }
  return globalForVoice.voiceSessions;
}

export function purgeExpiredVoiceSessions(now = Date.now()): number {
  let removed = 0;
  for (const [id, session] of store()) {
    if (now - session.updatedAt > VOICE_SESSION_TTL_MS) {
      store().delete(id);
      removed++;
    }
  }
  return removed;
}

export function createVoiceSession(params: {
  tenantId: string;
  userId: string;
  locale?: string;
}): VoiceSession {
  purgeExpiredVoiceSessions();
  const now = Date.now();
  const session: VoiceSession = {
    id: randomUUID(),
    tenantId: params.tenantId,
    userId: params.userId,
    locale: params.locale ?? "it",
    createdAt: now,
    updatedAt: now,
    turns: [],
  };
  store().set(session.id, session);
  return session;
}

export function getVoiceSession(sessionId: string): VoiceSession | null {
  purgeExpiredVoiceSessions();
  const session = store().get(sessionId);
  if (!session) return null;
  if (Date.now() - session.updatedAt > VOICE_SESSION_TTL_MS) {
    store().delete(sessionId);
    return null;
  }
  return session;
}

export function appendVoiceTurn(sessionId: string, turn: VoiceTurn): VoiceSession | null {
  const session = getVoiceSession(sessionId);
  if (!session) return null;
  session.turns.push(turn);
  session.updatedAt = Date.now();
  store().set(sessionId, session);
  return session;
}

export function getVoiceHistory(sessionId: string, limit = 24): VoiceTurn[] {
  const session = getVoiceSession(sessionId);
  if (!session) return [];
  return session.turns.slice(-limit);
}

export function deleteVoiceSession(sessionId: string): boolean {
  return store().delete(sessionId);
}

/** Test helper */
export function clearAllVoiceSessions(): void {
  store().clear();
}
