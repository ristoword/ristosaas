import { describe, expect, it, beforeEach } from "vitest";
import { VoiceConversation } from "@/lib/ai/voice/conversation";
import {
  clearAllVoiceSessions,
  createVoiceSession,
  getVoiceSession,
} from "@/lib/ai/voice/memory";
import { ruleBasedVoicePlan } from "@/lib/ai/voice/planner";
import { extractTranscriptFromEvent } from "@/lib/ai/voice/speech";

describe("voice memory", () => {
  beforeEach(() => clearAllVoiceSessions());

  it("creates and retrieves session", () => {
    const session = createVoiceSession({ tenantId: "t1", userId: "u1", locale: "it" });
    expect(getVoiceSession(session.id)?.tenantId).toBe("t1");
  });
});

describe("voice conversation", () => {
  beforeEach(() => clearAllVoiceSessions());

  it("maintains turn history", () => {
    const conv = VoiceConversation.start({ tenantId: "t1", userId: "u1" });
    conv.addUserMessage("Quanti coperti domani?");
    conv.addAssistantMessage("Hai 45 coperti prenotati.", { modulesUsed: ["prenotazioni"] });

    const history = conv.toAiHistory();
    expect(history).toHaveLength(2);
    expect(history[0].role).toBe("user");
    expect(history[1].content).toContain("45 coperti");
  });

  it("resumes existing session", () => {
    const conv = VoiceConversation.start({ tenantId: "t1", userId: "u1" });
    const resumed = VoiceConversation.resume(conv.sessionId);
    expect(resumed?.sessionId).toBe(conv.sessionId);
  });
});

describe("voice planner", () => {
  it("routes coperti to prenotazioni", () => {
    const plan = ruleBasedVoicePlan("Quanti coperti ho domani?");
    expect(plan.modules).toContain("prenotazioni");
  });

  it("enables tools for ordina il pesce", () => {
    const plan = ruleBasedVoicePlan("Ordina il pesce");
    expect(plan.enableTools).toBe(true);
    expect(plan.modules.some((m) => m === "inventory" || m === "kitchen")).toBe(true);
  });

  it("routes food cost query", () => {
    const plan = ruleBasedVoicePlan("Mostrami il food cost");
    expect(plan.modules).toContain("foodcost");
  });
});

describe("voice speech utils", () => {
  it("extracts final transcript", () => {
    const event = {
      results: {
        0: { 0: { transcript: "ciao mondo" }, isFinal: true },
        length: 1,
      },
    };
    const { transcript, isFinal } = extractTranscriptFromEvent(event);
    expect(transcript).toBe("ciao mondo");
    expect(isFinal).toBe(true);
  });
});
