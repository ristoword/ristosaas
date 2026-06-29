import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import {
  buildAiEnterpriseControlCenter,
  createAgent,
  deleteAgent,
  updateAgent,
} from "@/lib/ai/control-center/service";
import { clientIpFromRequest, requireControlMutate } from "@/app/api/admin/ai-control/_helpers";

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ["super_admin", "partner"]);
  if (guard.error) return guard.error;
  const url = new URL(req.url);
  const payload = await buildAiEnterpriseControlCenter(guard.user!, {
    tenantId: url.searchParams.get("tenantId") ?? undefined,
  });
  return ok(payload);
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ["super_admin"]);
  if (guard.error) return guard.error;
  const blocked = requireControlMutate(req, guard.user!);
  if (blocked) return blocked;

  const payload = await body<{
    tenantId?: string;
    slug?: string;
    name?: string;
    description?: string;
    module?: string;
    provider?: string;
    model?: string;
    prompt?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    memoryEnabled?: boolean;
    ragEnabled?: boolean;
    vectorEnabled?: boolean;
    toolCallingEnabled?: boolean;
    streamingEnabled?: boolean;
    webSearchEnabled?: boolean;
    schedulerEnabled?: boolean;
    active?: boolean;
  }>(req);

  if (!payload?.tenantId || !payload.slug || !payload.name || !payload.module) {
    return err("tenantId, slug, name, module required");
  }

  const agent = await createAgent(guard.user!, payload as Parameters<typeof createAgent>[1], clientIpFromRequest(req));
  return ok({ agent });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireApiUser(req, ["super_admin"]);
  if (guard.error) return guard.error;
  const blocked = requireControlMutate(req, guard.user!);
  if (blocked) return blocked;

  const payload = await body<{ id?: string } & Record<string, unknown>>(req);
  if (!payload?.id) return err("id required");

  const agent = await updateAgent(guard.user!, payload.id, payload, clientIpFromRequest(req));
  return ok({ agent });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireApiUser(req, ["super_admin"]);
  if (guard.error) return guard.error;
  const blocked = requireControlMutate(req, guard.user!);
  if (blocked) return blocked;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return err("id required");

  await deleteAgent(guard.user!, id, clientIpFromRequest(req));
  return ok({ success: true });
}
