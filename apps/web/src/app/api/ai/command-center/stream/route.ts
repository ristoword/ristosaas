import { NextRequest } from "next/server";
import { body, err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { buildCommandCenterDelta } from "@/lib/ai/command-center/dashboard-service";
import type { CommandCenterFilters } from "@/lib/ai/command-center/types";
import { createSseResponse } from "@/lib/ai/sse";

const ROLES = ["owner", "supervisor", "super_admin"] as const;
const TICK_MS = 15_000;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();

  const payload = await body<CommandCenterFilters & { since?: string }>(req).catch(
    () => ({}) as CommandCenterFilters & { since?: string },
  );
  const filters: CommandCenterFilters = {
    module: payload.module,
    userId: payload.userId,
    workflowId: payload.workflowId,
    automationModule: payload.automationModule,
    periodDays: payload.periodDays ?? 30,
  };

  return createSseResponse(async (emit, signal) => {
    let since = payload.since ?? new Date().toISOString();

    emit({ type: "status", message: "AI Command Center — connessione realtime" });

    while (!signal.aborted) {
      try {
        const delta = await buildCommandCenterDelta(tenantId, filters, since);
        emit({ type: "meta", data: { ...delta, tickAt: new Date().toISOString() } });
        since = new Date().toISOString();
      } catch (e) {
        emit({
          type: "error",
          message: e instanceof Error ? e.message : "Errore aggiornamento Command Center",
        });
      }

      await new Promise((resolve, reject) => {
        const t = setTimeout(resolve, TICK_MS);
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(t);
            reject(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      }).catch(() => undefined);

      if (signal.aborted) break;
    }

    emit({ type: "done", generatedAt: new Date().toISOString() });
  }, req.signal);
}

export async function GET() {
  return err("Use POST with SSE for realtime stream", 405);
}
