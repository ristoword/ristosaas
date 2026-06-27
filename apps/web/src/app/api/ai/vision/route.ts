import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { analyzeVisionImage } from "@/lib/ai/vision/service";
import type { VisionAnalyzeRequest } from "@/lib/ai/vision/types";
import { TASK_INTEGRATIONS, TASK_LABELS, VISION_TASK_TYPES } from "@/lib/ai/vision/types";
import { validateAnalyzeRequest } from "@/lib/ai/vision/validator";
import { getTenantId } from "@/lib/db/repositories/tenant-context";

const VISION_ROLES = [
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

export async function GET() {
  return ok({
    tasks: VISION_TASK_TYPES.map((type) => ({
      type,
      label: TASK_LABELS[type],
      integrations: TASK_INTEGRATIONS[type],
    })),
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, VISION_ROLES);
  if (guard.error) return guard.error;

  const payload = await body<VisionAnalyzeRequest>(req);
  const validation = validateAnalyzeRequest(payload);
  if (!validation.valid) {
    return err(validation.errors.join("; "), 400);
  }

  const tenantId = guard.user.tenantId || getTenantId();
  const result = await analyzeVisionImage({
    tenantId,
    request: payload,
    signal: req.signal,
  });

  return ok(result);
}
