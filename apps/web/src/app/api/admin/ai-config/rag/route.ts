import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { buildAiConfigCenter, runRagClear, runRagReindex } from "@/lib/ai/config-center/service";
import { recordAdminAudit } from "@/lib/observability/admin-audit";
import { clientIpFromRequest } from "@/lib/security/rate-limit";

const SUPER_ADMIN = ["super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, SUPER_ADMIN);
  if (guard.error) return guard.error;
  const center = await buildAiConfigCenter(false);
  return ok({ rag: center.rag, logs: center.logs.filter((l) => l.module === "rag" || l.message.includes("rag")) });
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, SUPER_ADMIN);
  if (guard.error) return guard.error;

  const payload = await body<{ action?: string }>(req);
  const action = payload?.action;
  if (!action) return err("action required");

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey && (action === "reindex" || action === "sync" || action === "reindex_all")) {
    return err("OPENAI_API_KEY required for indexing", 503);
  }

  const meta = {
    ip: clientIpFromRequest(req),
    device: req.headers.get("user-agent")?.slice(0, 200) ?? "unknown",
  };

  try {
    if (action === "clear") {
      await runRagClear();
      void recordAdminAudit({ action: "ai.config.rag.clear", actor: guard.user, metadata: meta, req });
      return ok({ success: true, action });
    }

    if (action === "reindex" || action === "reindex_all" || action === "sync" || action === "update") {
      const result = await runRagReindex(apiKey!);
      void recordAdminAudit({
        action: action === "sync" || action === "update" ? "ai.config.rag.sync" : "ai.config.rag.reindex",
        actor: guard.user,
        metadata: { ...meta, ...result },
        req,
      });
      return ok({ success: true, action, ...result });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(message, 500);
  }
}
