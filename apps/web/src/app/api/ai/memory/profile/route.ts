import { NextRequest } from "next/server";
import { ok, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { conversationStore } from "@/lib/ai/memory/conversation-store";

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const user = guard.user;
  const tenantId = user?.tenantId || getTenantId();

  const profile = await conversationStore.getOrCreateProfile(tenantId, user.id);
  return ok(profile);
}

export async function PATCH(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const user = guard.user;
  const tenantId = user?.tenantId || getTenantId();

  const payload = await body<{
    preferences?: Record<string, unknown>;
    lastContext?: string;
    summary?: string;
  }>(req);

  const profile = await conversationStore.updateProfile(tenantId, user.id, {
    ...(payload.preferences !== undefined ? { preferences: payload.preferences } : {}),
    ...(payload.lastContext !== undefined ? { lastContext: payload.lastContext } : {}),
    ...(payload.summary !== undefined ? { summary: payload.summary } : {}),
  });

  return ok(profile);
}
