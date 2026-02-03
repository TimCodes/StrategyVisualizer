import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { EventEmitter } from "events";

export const eventBus = new EventEmitter();
eventBus.setMaxListeners(100);

let io: SocketIOServer | null = null;

export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("subscribe", (room: string) => {
      socket.join(room);
      console.log(`Client ${socket.id} subscribed to ${room}`);
    });

    socket.on("unsubscribe", (room: string) => {
      socket.leave(room);
      console.log(`Client ${socket.id} unsubscribed from ${room}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  eventBus.on("market:tick", (data) => {
    io?.to("market").emit("market:tick", data);
  });

  eventBus.on("portfolio:update", (data) => {
    io?.to("portfolio").emit("portfolio:update", data);
  });

  eventBus.on("trade:executed", (data) => {
    io?.to("trades").emit("trade:executed", data);
  });

  eventBus.on("risk:alert", (data) => {
    io?.to("risk").emit("risk:alert", data);
  });

  eventBus.on("signal:detected", (data) => {
    io?.to("signals").emit("signal:detected", data);
  });

  console.log("WebSocket server initialized");

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitToRoom(room: string, event: string, data: any): void {
  io?.to(room).emit(event, data);
}

export function emitToSocket(
  socketId: string,
  event: string,
  data: any
): void {
  io?.to(socketId).emit(event, data);
}

export function broadcastToAll(event: string, data: any): void {
  io?.emit(event, data);
}

export async function streamLLMResponse(
  socketId: string,
  sessionId: string,
  tokenStream: AsyncIterable<{ token: string; done: boolean }>
): Promise<string> {
  let fullResponse = "";

  for await (const { token, done } of tokenStream) {
    fullResponse += token;
    emitToSocket(socketId, "llm:token", {
      sessionId,
      token,
      done,
      fullResponse: done ? fullResponse : undefined,
    });
  }

  return fullResponse;
}

export type { SocketIOServer, Socket };
