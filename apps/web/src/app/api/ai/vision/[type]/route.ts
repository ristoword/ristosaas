import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { analyzeVisionImage } from "@/lib/ai/vision/service";
import { isVisionTaskType } from "@/lib/ai/vision/validator";
import { TASK_INTEGRATIONS, TASK_LABELS } from "@/lib/ai/vision/types";
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

type RouteContext = { params: Promise<{ type: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const guard = await requireApiUser(req, VISION_ROLES);
  if (guard.error) return guard.error;

  const { type } = await context.params;
  if (!isVisionTaskType(type)) {
    return err(`Tipo analisi non valido: ${type}`, 404);
  }

  const payload = await body<{ image?: string; locale?: string; hints?: string; mimeType?: string }>(req);
  if (!payload.image?.trim()) {
    return err("image richiesta (base64, data URL o URL HTTPS)", 400);
  }

  const tenantId = guard.user.tenantId || getTenantId();
  const result = await analyzeVisionImage({
    tenantId,
    request: {
      taskType: type,
      image: payload.image,
      locale: payload.locale,
      hints: payload.hints,
      mimeType: payload.mimeType,
    },
    signal: req.signal,
  });

  return ok(result);
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { type } = await context.params;
  if (!isVisionTaskType(type)) {
    return err(`Tipo analisi non valido: ${type}`, 404);
  }

  return ok({
    type,
    label: TASK_LABELS[type],
    integrations: TASK_INTEGRATIONS[type],
  });
}
