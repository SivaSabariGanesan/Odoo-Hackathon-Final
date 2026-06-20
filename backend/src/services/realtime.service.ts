/**
 * Centralized real-time broadcast service.
 *
 * Architecture:
 *  - Three WebSocket namespaces: /ws/kds, /ws/customer-display/:sessionId, /ws/self-order/:orderId
 *  - All business services call the broadcast* helpers here — no WS logic elsewhere.
 *  - WS handlers in ws.ts only manage subscriptions/lifecycle; no business logic.
 */

// ─── Connection registries ────────────────────────────────────────────────────

/** All connected kitchen clients */
const kdsClients = new Set<WebSocket>();

/** sessionId → Set of connected customer-display WS clients */
const displayClients = new Map<string, Set<WebSocket>>();

/** orderId → Set of connected self-order WS clients */
const selfOrderClients = new Map<string, Set<WebSocket>>();

// ─── KDS registry ─────────────────────────────────────────────────────────────

export function registerKdsClient(ws: WebSocket) {
  kdsClients.add(ws);
}

export function unregisterKdsClient(ws: WebSocket) {
  kdsClients.delete(ws);
}

// ─── Customer display registry ────────────────────────────────────────────────

export function registerDisplayClient(sessionId: string, ws: WebSocket) {
  if (!displayClients.has(sessionId)) displayClients.set(sessionId, new Set());
  displayClients.get(sessionId)!.add(ws);
}

export function unregisterDisplayClient(sessionId: string, ws: WebSocket) {
  const set = displayClients.get(sessionId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) displayClients.delete(sessionId);
}

// ─── Self-order registry ──────────────────────────────────────────────────────

export function registerSelfOrderClient(orderId: string, ws: WebSocket) {
  if (!selfOrderClients.has(orderId)) selfOrderClients.set(orderId, new Set());
  selfOrderClients.get(orderId)!.add(ws);
}

export function unregisterSelfOrderClient(orderId: string, ws: WebSocket) {
  const set = selfOrderClients.get(orderId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) selfOrderClients.delete(orderId);
}

// ─── Internal send helper ─────────────────────────────────────────────────────

function send(ws: WebSocket, payload: object) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  } catch {
    // Stale connection — ignore; cleanup happens on close event
  }
}

function broadcast(clients: Iterable<WebSocket>, payload: object) {
  for (const ws of clients) send(ws, payload);
}

// ─── KDS broadcasts ───────────────────────────────────────────────────────────

export interface KdsOrderPayload {
  orderId: string;
  orderNumber: string;
  tokenNumber?: number | null;
  tableLabel?: string | null;
  status: string;
  items: { name: string; quantity: number; notes?: string | null }[];
}

export function broadcastOrderCreated(payload: KdsOrderPayload) {
  broadcast(kdsClients, { event: "NEW_ORDER", at: new Date().toISOString(), ...payload });
}

export function broadcastOrderUpdated(payload: KdsOrderPayload) {
  broadcast(kdsClients, { event: "ORDER_UPDATED", at: new Date().toISOString(), ...payload });
}

export function broadcastOrderCancelled(orderId: string, orderNumber: string) {
  broadcast(kdsClients, { event: "ORDER_CANCELLED", at: new Date().toISOString(), orderId, orderNumber });
}

export function broadcastPaymentCompleted(orderId: string, orderNumber: string) {
  broadcast(kdsClients, { event: "PAYMENT_COMPLETED", at: new Date().toISOString(), orderId, orderNumber });
}

// ─── Customer display broadcasts ──────────────────────────────────────────────

export interface DisplayOrderPayload {
  orderId: string;
  orderNumber: string;
  status: string;
  items?: { name: string; quantity: number }[];
  grandTotal?: string;
}

export function broadcastOrderStatusChanged(sessionId: string, payload: DisplayOrderPayload) {
  const clients = displayClients.get(sessionId);
  if (!clients) return;
  broadcast(clients, { event: "ORDER_STATUS_CHANGED", at: new Date().toISOString(), ...payload });
}

export function broadcastDisplayOrderCreated(sessionId: string, payload: DisplayOrderPayload) {
  const clients = displayClients.get(sessionId);
  if (!clients) return;
  broadcast(clients, { event: "ORDER_CREATED", at: new Date().toISOString(), ...payload });
}

export function broadcastPaymentUpdated(sessionId: string, payload: DisplayOrderPayload) {
  const clients = displayClients.get(sessionId);
  if (!clients) return;
  broadcast(clients, { event: "PAYMENT_UPDATED", at: new Date().toISOString(), ...payload });
}

// ─── Self-order broadcasts ────────────────────────────────────────────────────

export type SelfOrderEvent =
  | "ORDER_CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "CANCELLED";

export function broadcastSelfOrderUpdate(orderId: string, event: SelfOrderEvent, extra?: object) {
  const clients = selfOrderClients.get(orderId);
  if (!clients) return;
  broadcast(clients, { event, at: new Date().toISOString(), orderId, ...extra });
}
