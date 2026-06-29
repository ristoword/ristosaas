import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { executeVoiceTurn, runVoiceTurnStream } from "@/lib/ai/voice/executor";
import { getVoiceSession } from "@/lib/ai/voice/memory";
import type { VoiceTurnRequest } from "@/lib/ai/voice/types";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { isVoiceRuntimeEnabled, isAiFeatureEnabled } from "@/lib/ai/platform-config.runtime";

const VOICE_ROLES = [
  "owner",
  "supervisor",
  "cucina",
  "magazzino",
  "sala",
  "bar",
  "pizzeria",
  "cassa",
  "hotel_manager",
  "reception",
  "housekeeping",
  "super_admin",
] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, VOICE_ROLES);
  if (guard.error) return guard.error;

  if (!(await isAiFeatureEnabled("master")) || !(await isVoiceRuntimeEnabled())) {
    return err("Voice AI disattivato dalla piattaforma", 503);
  }

  const payload = await body<VoiceTurnRequest>(req);
  if (!payload.sessionId?.trim()) return err("sessionId obbligatorio", 400);
  if (!payload.transcript?.trim()) return err("transcript obbligatorio", 400);

  const tenantId = guard.user.tenantId || getTenantId();
  const session = getVoiceSession(payload.sessionId);
  if (!session) return err("Sessione non trovata o scaduta", 404);
  if (session.tenantId !== tenantId) return err("Sessione non autorizzata", 403);

  if (payload.stream) {
    return runVoiceTurnStream(
      {
        tenantId,
        userId: guard.user.id,
        userRole: guard.user.role,
        sessionId: payload.sessionId,
        transcript: payload.transcript.trim(),
        locale: payload.locale ?? session.locale,
      },
      req.signal,
    );
  }

  const result = await executeVoiceTurn({
    tenantId,
    userId: guard.user.id,
    userRole: guard.user.role,
    sessionId: payload.sessionId,
    transcript: payload.transcript.trim(),
    locale: payload.locale ?? session.locale,
    signal: req.signal,
  });

  return ok(result);
}
