import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { testDevicePrint } from "@/lib/integrations/print-dispatcher";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  try {
    const result = await testDevicePrint(getTenantId(), id);
    return ok(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(message, 400);
  }
}
