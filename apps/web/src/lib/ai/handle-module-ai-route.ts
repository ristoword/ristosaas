import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getModuleDefinition, normalizeModuleId } from "@/lib/ai/modules/config";
import type { ModuleAiRequest } from "@/lib/ai/modules/types";
import { runModuleAi, runModuleAiStream } from "@/lib/ai/module-ai.service";
import { getTenantId } from "@/lib/db/repositories/tenant-context";

function parseRequest(req: NextRequest, payload?: ModuleAiRequest): ModuleAiRequest {
  const url = req.nextUrl;
  const enrichParam = url.searchParams.get("enrich");
  const streamParam = url.searchParams.get("stream");
  const periodParam = url.searchParams.get("periodDays");
  const localeParam = url.searchParams.get("locale");

  return {
    enrich: payload?.enrich ?? (enrichParam === "true" || enrichParam === "1"),
    stream: payload?.stream ?? (streamParam === "true" || streamParam === "1"),
    locale: payload?.locale ?? localeParam ?? undefined,
    periodDays: payload?.periodDays ?? (periodParam ? Number(periodParam) : undefined),
  };
}

export async function handleModuleAiGet(req: NextRequest, moduleSlug: string) {
  const moduleId = normalizeModuleId(moduleSlug);
  if (!moduleId) return err("Modulo AI non valido", 404);

  const def = getModuleDefinition(moduleId);
  const guard = await requireApiUser(req, def.roles);
  if (guard.error) return guard.error;

  const tenantId = guard.user.tenantId || getTenantId();
  const options = parseRequest(req);

  if (options.stream) {
    const stream = runModuleAiStream(moduleSlug, { tenantId, userId: guard.user.id }, { ...options, enrich: true }, req.signal);
    if (!stream) return err("Modulo AI non valido", 404);
    return stream;
  }

  const result = await runModuleAi(moduleSlug, { tenantId, userId: guard.user.id }, options);
  if (!result) return err("Modulo AI non valido", 404);
  return ok(result);
}

export async function handleModuleAiPost(req: NextRequest, moduleSlug: string) {
  const moduleId = normalizeModuleId(moduleSlug);
  if (!moduleId) return err("Modulo AI non valido", 404);

  const def = getModuleDefinition(moduleId);
  const guard = await requireApiUser(req, def.roles);
  if (guard.error) return guard.error;

  const tenantId = guard.user.tenantId || getTenantId();
  const payload = (await body<ModuleAiRequest>(req)) ?? {};
  const options = parseRequest(req, payload);

  if (options.stream) {
    const stream = runModuleAiStream(
      moduleSlug,
      { tenantId, userId: guard.user.id },
      { ...options, enrich: options.enrich ?? true },
      req.signal,
    );
    if (!stream) return err("Modulo AI non valido", 404);
    return stream;
  }

  const result = await runModuleAi(
    moduleSlug,
    { tenantId, userId: guard.user.id },
    { ...options, enrich: options.enrich ?? true },
  );
  if (!result) return err("Modulo AI non valido", 404);
  return ok(result);
}
