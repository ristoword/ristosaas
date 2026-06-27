import { NextRequest } from "next/server";
import { ok, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getModuleDefinition } from "@/lib/ai/modules/config";
import { runModuleAi, runModuleAiStream } from "@/lib/ai/module-ai.service";
import { getTenantId } from "@/lib/db/repositories/tenant-context";

const MODULE_ID = "cantina" as const;

export async function GET(req: NextRequest) {
  const def = getModuleDefinition(MODULE_ID);
  const guard = await requireApiUser(req, def.roles);
  if (guard.error) return guard.error;

  const tenantId = guard.user.tenantId || getTenantId();
  const enrich = req.nextUrl.searchParams.get("enrich") === "true";
  const stream = req.nextUrl.searchParams.get("stream") === "true";
  const locale = req.nextUrl.searchParams.get("locale") ?? undefined;

  if (stream) {
    const response = runModuleAiStream(
      MODULE_ID,
      { tenantId, userId: guard.user.id },
      { enrich: true, locale },
      req.signal,
    );
    return response!;
  }

  const result = await runModuleAi(MODULE_ID, { tenantId, userId: guard.user.id }, { enrich, locale });

  if (!enrich && result) {
    return ok(result.snapshot);
  }

  return ok(result);
}

export async function POST(req: NextRequest) {
  const def = getModuleDefinition(MODULE_ID);
  const guard = await requireApiUser(req, def.roles);
  if (guard.error) return guard.error;

  const tenantId = guard.user.tenantId || getTenantId();
  const payload = (await body<{ enrich?: boolean; stream?: boolean; locale?: string }>(req)) ?? {};

  if (payload.stream) {
    const response = runModuleAiStream(
      MODULE_ID,
      { tenantId, userId: guard.user.id },
      { enrich: true, locale: payload.locale },
      req.signal,
    );
    return response!;
  }

  const result = await runModuleAi(
    MODULE_ID,
    { tenantId, userId: guard.user.id },
    { enrich: payload.enrich ?? true, locale: payload.locale },
  );

  if (!payload.enrich && result) {
    return ok(result.snapshot);
  }

  return ok(result);
}
