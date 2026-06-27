import type { OrchestratorModuleId } from "@/lib/ai/orchestrator/types";

export type VoiceTurnRole = "user" | "assistant";

export type VoiceTurn = {
  role: VoiceTurnRole;
  content: string;
  ts: number;
  actions?: string[];
  modulesUsed?: OrchestratorModuleId[];
};

export type VoiceSession = {
  id: string;
  tenantId: string;
  userId: string;
  locale: string;
  createdAt: number;
  updatedAt: number;
  turns: VoiceTurn[];
};

export type VoicePlan = {
  modules: OrchestratorModuleId[];
  enableTools: boolean;
  primaryContext: string;
  reasoning: string;
  source: "rules" | "rules+ai";
};

export type VoiceTurnRequest = {
  sessionId: string;
  transcript: string;
  locale?: string;
  stream?: boolean;
};

export type VoiceTurnResult = {
  sessionId: string;
  reply: string;
  plan: VoicePlan;
  modulesUsed: OrchestratorModuleId[];
  actions: string[];
  source: "rules" | "rules+ai";
};

export const VOICE_SESSION_TTL_MS = 4 * 60 * 60 * 1000;
export const VOICE_MAX_HISTORY_TURNS = 24;

export const SPEECH_LOCALE_MAP: Record<string, string> = {
  it: "it-IT",
  en: "en-US",
  nl: "nl-NL",
  pt: "pt-PT",
};

export const TTS_VOICE_MAP: Record<string, string> = {
  it: "nova",
  en: "alloy",
  nl: "nova",
  pt: "nova",
};
