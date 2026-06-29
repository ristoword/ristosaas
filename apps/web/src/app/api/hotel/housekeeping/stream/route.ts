import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { encodeHousekeepingSse, subscribeHousekeepingEvents, type HousekeepingStreamEvent } from "@/lib/hotel/housekeeping-event-bus";

const ROLES = ["hotel_manager", "reception", "housekeeping", "supervisor", "owner", "super_admin"] as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();

  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort(), { once: true });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const push = (event: HousekeepingStreamEvent) => {
        if (abort.signal.aborted) return;
        try {
          controller.enqueue(encodeHousekeepingSse(event));
        } catch {
          abort.abort();
        }
      };

      const unsubscribe = subscribeHousekeepingEvents(tenantId, push);
      push({ type: "hk_updated", reason: "connected" });

      const heartbeat = setInterval(() => {
        if (abort.signal.aborted) return;
        push({ type: "heartbeat", at: new Date().toISOString() });
      }, 25000);

      abort.signal.addEventListener(
        "abort",
        () => {
          clearInterval(heartbeat);
          unsubscribe();
          try {
            controller.close();
          } catch {
            /* closed */
          }
        },
        { once: true },
      );
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
