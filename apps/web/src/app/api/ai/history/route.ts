import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { aiChatRepository } from "@/lib/db/repositories/ai-chat.repository";

export async function GET(req: NextRequest) {
  const guard = requireApiUser(req);
  if (guard.error) return guard.error;
  const user = guard.user;
  const context = req.nextUrl.searchParams.get("context")?.trim().toLowerCase();
  const tenantId = user?.tenantId || getTenantId();
  const rows = await aiChatRepository.list(tenantId, user.id, context || undefined);
  return ok(
    rows.map((row) => ({
      id: row.id,
      context: row.context,
      userMessage: row.userMessage,
      assistantMessage: row.assistantMessage,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
    })),
  );
}
