import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getVoiceSession } from "@/lib/ai/voice/memory";
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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const guard = await requireApiUser(req, VOICE_ROLES);
  if (guard.error) return guard.error;

  const { id } = await context.params;
  const session = getVoiceSession(id);
  if (!session) return err("Sessione non trovata o scaduta", 404);

  const tenantId = guard.user.tenantId || getTenantId();
  if (session.tenantId !== tenantId) return err("Sessione non autorizzata", 403);

  return ok({
    sessionId: session.id,
    locale: session.locale,
    turns: session.turns,
    updatedAt: new Date(session.updatedAt).toISOString(),
  });
}
