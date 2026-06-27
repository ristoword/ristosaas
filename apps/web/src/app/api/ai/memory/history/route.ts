import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { conversationStore } from "@/lib/ai/memory/conversation-store";

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const user = guard.user;
  const tenantId = user?.tenantId || getTenantId();

  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? 30);
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 30;

  const turns = await conversationStore.listTurns(tenantId, user.id, limit);
  const profile = await conversationStore.getOrCreateProfile(tenantId, user.id);

  return ok({
    profile: {
      preferences: profile.preferences,
      lastContext: profile.lastContext,
      summary: profile.summary,
      updatedAt: profile.updatedAt,
    },
    turns,
  });
}
