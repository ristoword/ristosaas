import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import {
  getAiPlatformConfig,
  patchAiPlatformConfig,
  type AiPlatformTogglePatch,
} from "@/lib/db/repositories/ai-platform-config.repository";
import { invalidateAiRuntimeCache } from "@/lib/ai/platform-config.runtime";
import { buildAiConfigCenter } from "@/lib/ai/config-center/service";
import { recordAdminAudit } from "@/lib/observability/admin-audit";
import { clientIpFromRequest } from "@/lib/security/rate-limit";

const SUPER_ADMIN = ["super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, SUPER_ADMIN);
  if (guard.error) return guard.error;
  const payload = await buildAiConfigCenter(false);
  return ok(payload);
}

const TOGGLE_KEYS: (keyof AiPlatformTogglePatch)[] = [
  "aiMasterEnabled",
  "memoryEnabled",
  "ragEnabled",
  "vectorDbEnabled",
  "toolCallingEnabled",
  "voiceAiEnabled",
  "automationsEnabled",
  "schedulerEnabled",
  "streamingEnabled",
  "webSearchEnabled",
  "multiAgentEnabled",
  "vectorProvider",
  "memoryRetentionDays",
];

function deviceFromRequest(req: NextRequest): string {
  return req.headers.get("user-agent")?.slice(0, 200) ?? "unknown";
}

export async function PATCH(req: NextRequest) {
  const guard = await requireApiUser(req, SUPER_ADMIN);
  if (guard.error) return guard.error;

  const payload = await body<Record<string, unknown>>(req);
  if (!payload) return err("Invalid body");

  const before = await getAiPlatformConfig();
  const patch: AiPlatformTogglePatch = {};

  for (const key of TOGGLE_KEYS) {
    if (key in payload) {
      const val = payload[key];
      if (key === "memoryRetentionDays") {
        if (typeof val !== "number" || val < 1 || val > 3650) return err("memoryRetentionDays must be 1-3650");
        patch.memoryRetentionDays = val;
      } else if (key === "vectorProvider") {
        if (typeof val !== "string") return err("vectorProvider must be string");
        patch.vectorProvider = val;
      } else if (typeof val !== "boolean") {
        return err(`${key} must be boolean`);
      } else {
        (patch as Record<string, boolean>)[key] = val;
      }
    }
  }

  if (Object.keys(patch).length === 0) return err("No valid toggle fields");

  const after = await patchAiPlatformConfig(patch, guard.user.id);
  invalidateAiRuntimeCache();

  for (const key of Object.keys(patch)) {
    void recordAdminAudit({
      action: "ai.config.toggle",
      actor: guard.user,
      metadata: {
        setting: key,
        previousValue: before[key as keyof typeof before],
        newValue: after[key as keyof typeof after],
        ip: clientIpFromRequest(req),
        device: deviceFromRequest(req),
      },
      req,
    });
  }

  return ok(await buildAiConfigCenter(false));
}
