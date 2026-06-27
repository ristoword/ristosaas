import { NextRequest } from "next/server";
import { body, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { createVoiceSession } from "@/lib/ai/voice/memory";
import { getTenantId } from "@/lib/db/repositories/tenant-context";

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

  const payload = await body<{ locale?: string }>(req);
  const tenantId = guard.user.tenantId || getTenantId();

  const session = createVoiceSession({
    tenantId,
    userId: guard.user.id,
    locale: payload.locale ?? "it",
  });

  return ok({
    sessionId: session.id,
    locale: session.locale,
    createdAt: new Date(session.createdAt).toISOString(),
  });
}
