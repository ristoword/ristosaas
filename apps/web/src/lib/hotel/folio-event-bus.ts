export type FolioUpdatedEvent = { type: "folio_updated"; folioId?: string; reason: string };
export type FolioStreamEvent = FolioUpdatedEvent | { type: "heartbeat"; at: string };

type Listener = (event: FolioStreamEvent) => void;

const tenantListeners = new Map<string, Set<Listener>>();

export function subscribeFolioEvents(tenantId: string, listener: Listener): () => void {
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

export function emitFolioEvent(tenantId: string, event: { folioId?: string; reason: string } | { type: "heartbeat"; at: string }) {
  const payload: FolioStreamEvent =
    "type" in event && event.type === "heartbeat"
      ? { type: "heartbeat", at: event.at }
      : { type: "folio_updated", folioId: "folioId" in event ? event.folioId : undefined, reason: "reason" in event ? event.reason : "update" };

  const set = tenantListeners.get(tenantId);
  if (!set) return;
  for (const listener of set) {
    try {
      listener(payload);
    } catch {
      /* ignore listener errors */
    }
  }
}

export function encodeFolioSse(event: FolioStreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}
