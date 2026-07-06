"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "./events";
import { measureOrderLatency } from "./latency";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let sharedSocket: TypedSocket | null = null;
let refCount = 0;

function getOrCreateSocket(): TypedSocket {
  if (!sharedSocket) {
    sharedSocket = io({
      path: "/api/ws",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
    });
  }
  refCount++;
  return sharedSocket;
}

function releaseSocket() {
  refCount--;
  if (refCount <= 0 && sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
    refCount = 0;
  }
}

export function useOrderSocket(
  tenantId: string | undefined,
  handlers: {
    onOrderCreated?: (order: ServerToClientEvents["order:created"] extends (p: infer P) => void ? P : never) => void;
    onOrderUpdated?: (order: ServerToClientEvents["order:updated"] extends (p: infer P) => void ? P : never) => void;
    onOrderAppended?: (order: ServerToClientEvents["order:appended"] extends (p: infer P) => void ? P : never) => void;
    onOrderStatusChanged?: (order: ServerToClientEvents["order:status_changed"] extends (p: infer P) => void ? P : never) => void;
    onOrderDeleted?: (payload: { orderId: string }) => void;
  },
) {
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!tenantId) return;

    const socket = getOrCreateSocket();

    function onConnect() {
      setConnected(true);
      socket.emit("join:tenant", tenantId!);
    }
    function onDisconnect() {
      setConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    if (socket.connected) {
      setConnected(true);
      socket.emit("join:tenant", tenantId);
    }

    socket.on("order:created", (p) => {
      measureOrderLatency(p.serverTimestamp, "order:created");
      handlersRef.current.onOrderCreated?.(p);
    });
    socket.on("order:updated", (p) => {
      measureOrderLatency(p.serverTimestamp, "order:updated");
      handlersRef.current.onOrderUpdated?.(p);
    });
    socket.on("order:appended", (p) => {
      measureOrderLatency(p.serverTimestamp, "order:appended");
      handlersRef.current.onOrderAppended?.(p);
    });
    socket.on("order:status_changed", (p) => {
      measureOrderLatency(p.serverTimestamp, "order:status_changed");
      handlersRef.current.onOrderStatusChanged?.(p);
    });
    socket.on("order:deleted", (p) => handlersRef.current.onOrderDeleted?.(p));

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("order:created");
      socket.off("order:updated");
      socket.off("order:appended");
      socket.off("order:status_changed");
      socket.off("order:deleted");
      releaseSocket();
    };
  }, [tenantId]);

  return { connected };
}
