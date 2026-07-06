import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import type { ServerToClientEvents, ClientToServerEvents } from "./events";

type TypedServer = SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

let io: TypedServer | null = null;

export function initSocketServer(httpServer: HttpServer): TypedServer {
  if (io) return io;

  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    path: "/api/ws",
    addTrailingSlash: false,
    transports: ["websocket", "polling"],
    pingInterval: 25_000,
    pingTimeout: 20_000,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join:tenant", (tenantId) => {
      if (typeof tenantId === "string" && tenantId.length > 0) {
        void socket.join(`tenant:${tenantId}`);
      }
    });

    socket.on("disconnect", () => {
      // cleanup handled by socket.io
    });
  });

  console.log("[realtime] Socket.IO server initialized on /api/ws");
  return io;
}

export function getIO(): TypedServer | null {
  return io;
}
