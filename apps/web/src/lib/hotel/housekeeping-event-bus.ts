export type HousekeepingStreamEvent =
  | { type: "hk_updated"; reason: string; roomId?: string; taskId?: string }
  | { type: "heartbeat"; at: string };

type Listener = (event: HousekeepingStreamEvent) => void;

const tenantListeners = new Map<string, Set<Listener>>();

export function subscribeHousekeepingEvents(tenantId: string, listener: Listener): () => void {
  let set = tenantListeners.get(tenantId);
  if (!set) {
    set = new Set();
    tenantListeners.set(tenantId, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) tenantListeners.delete(tenantId);
  };
}

export function emitHousekeepingEvent(
  tenantId: string,
  event: { reason: string; roomId?: string; taskId?: string } | { type: "heartbeat"; at: string },
) {
  const payload: HousekeepingStreamEvent =
    "type" in event && event.type === "heartbeat"
      ? { type: "heartbeat", at: event.at }
      : {
          type: "hk_updated",
          reason: "reason" in event ? event.reason : "update",
          roomId: "roomId" in event ? event.roomId : undefined,
          taskId: "taskId" in event ? event.taskId : undefined,
        };

  const set = tenantListeners.get(tenantId);
  if (!set) return;
  for (const listener of set) {
    try {
      listener(payload);
    } catch {
      /* ignore */
    }
  }
}

export function encodeHousekeepingSse(event: HousekeepingStreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}
