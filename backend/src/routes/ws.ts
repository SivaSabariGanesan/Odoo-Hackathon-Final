/**
 * WebSocket server — pure subscription/lifecycle management.
 * No business logic lives here. All broadcasts go through realtime.service.ts.
 *
 * Namespaces (matched by URL path):
 *   /ws/kds                         — Kitchen Display System (broadcast to all kitchen clients)
 *   /ws/customer-display/:sessionId — Customer-facing display (session-scoped)
 *   /ws/self-order/:orderId         — Mobile order tracking (order-scoped)
 *
 * Integration: call attachWebSocketServer(httpServer) once after serve() in index.ts.
 */

import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server as HttpServer } from "http";
import {
  registerKdsClient,
  unregisterKdsClient,
  registerDisplayClient,
  unregisterDisplayClient,
  registerSelfOrderClient,
  unregisterSelfOrderClient,
} from "../services/realtime.service.ts";

// ─── Path routing helpers ─────────────────────────────────────────────────────

function parsePath(req: IncomingMessage): { namespace: string; param: string } | null {
  const url = req.url ?? "";
  // /ws/kds
  if (url === "/ws/kds") return { namespace: "kds", param: "" };
  // /ws/customer-display/:sessionId
  const displayMatch = url.match(/^\/ws\/customer-display\/([^/?]+)/);
  if (displayMatch) return { namespace: "customer-display", param: displayMatch[1]! };
  // /ws/self-order/:orderId
  const selfOrderMatch = url.match(/^\/ws\/self-order\/([^/?]+)/);
  if (selfOrderMatch) return { namespace: "self-order", param: selfOrderMatch[1]! };

  return null;
}

// ─── Attach to HTTP server ────────────────────────────────────────────────────

export function attachWebSocketServer(httpServer: HttpServer) {
  // noServer=true — we handle the upgrade event manually so we can route by path
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    const route = parsePath(req);
    if (!route) {
      // Not a WebSocket path we handle — destroy connection cleanly
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, route);
    });
  });

  wss.on(
    "connection",
    (ws: WebSocket, _req: IncomingMessage, route: { namespace: string; param: string }) => {
      const { namespace, param } = route;

      // ── KDS ──────────────────────────────────────────────────────────────
      if (namespace === "kds") {
        registerKdsClient(ws as unknown as globalThis.WebSocket);
        console.log("[ws/kds] client connected");

        send(ws, { event: "CONNECTED", namespace: "kds", at: ts() });

        ws.on("message", (data) => {
          // KDS is receive-only — log unexpected messages but don't error
          console.log("[ws/kds] unexpected client message:", data.toString().slice(0, 120));
        });

        ws.on("close", () => {
          unregisterKdsClient(ws as unknown as globalThis.WebSocket);
          console.log("[ws/kds] client disconnected");
        });

        ws.on("error", (err) => {
          unregisterKdsClient(ws as unknown as globalThis.WebSocket);
          console.error("[ws/kds] error:", err.message);
        });

        return;
      }

      // ── Customer display ──────────────────────────────────────────────────
      if (namespace === "customer-display") {
        const sessionId = param;
        registerDisplayClient(sessionId, ws as unknown as globalThis.WebSocket);
        console.log(`[ws/display] session=${sessionId} connected`);

        send(ws, { event: "CONNECTED", namespace: "customer-display", sessionId, at: ts() });

        ws.on("message", () => { /* display is receive-only */ });

        ws.on("close", () => {
          unregisterDisplayClient(sessionId, ws as unknown as globalThis.WebSocket);
          console.log(`[ws/display] session=${sessionId} disconnected`);
        });

        ws.on("error", (err) => {
          unregisterDisplayClient(sessionId, ws as unknown as globalThis.WebSocket);
          console.error(`[ws/display] session=${sessionId} error:`, err.message);
        });

        return;
      }

      // ── Self-order tracking ───────────────────────────────────────────────
      if (namespace === "self-order") {
        const orderId = param;
        registerSelfOrderClient(orderId, ws as unknown as globalThis.WebSocket);
        console.log(`[ws/self-order] orderId=${orderId} connected`);

        send(ws, { event: "CONNECTED", namespace: "self-order", orderId, at: ts() });

        ws.on("message", () => { /* self-order tracking is receive-only */ });

        ws.on("close", () => {
          unregisterSelfOrderClient(orderId, ws as unknown as globalThis.WebSocket);
          console.log(`[ws/self-order] orderId=${orderId} disconnected`);
        });

        ws.on("error", (err) => {
          unregisterSelfOrderClient(orderId, ws as unknown as globalThis.WebSocket);
          console.error(`[ws/self-order] orderId=${orderId} error:`, err.message);
        });
      }
    },
  );

  console.log("🔌  WebSocket  → ws://localhost (paths: /ws/kds, /ws/customer-display/:id, /ws/self-order/:id)");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function send(ws: WebSocket, payload: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function ts() {
  return new Date().toISOString();
}
