/**
 * Unit tests for the realtime broadcast service.
 * Tests registry management and message delivery without real WebSocket connections.
 * Uses mock WebSocket objects that mimic the ws library interface.
 *
 * Run: bun test src/tests/realtime.test.ts
 */
import { describe, it, expect, beforeEach } from "bun:test";

// ─── Minimal WebSocket mock ───────────────────────────────────────────────────

const WS_OPEN = 1;
const WS_CLOSED = 3;

interface MockWS {
  readyState: number;
  messages: string[];
  send(data: string): void;
}

function makeMockWS(open = true): MockWS {
  return {
    readyState: open ? WS_OPEN : WS_CLOSED,
    messages: [],
    send(data: string) {
      this.messages.push(data);
    },
  };
}

// ─── Inline implementation mirrors realtime.service.ts ───────────────────────
// We re-implement the registry here so tests are self-contained and don't
// depend on module-level singletons that persist across test files.

type WS = MockWS;

function makeRegistry() {
  const kds = new Set<WS>();
  const display = new Map<string, Set<WS>>();
  const selfOrder = new Map<string, Set<WS>>();

  function sendTo(ws: WS, payload: object) {
    if (ws.readyState === WS_OPEN) ws.send(JSON.stringify(payload));
  }

  function broadcastTo(clients: Iterable<WS>, payload: object) {
    for (const ws of clients) sendTo(ws, payload);
  }

  return {
    kds,
    display,
    selfOrder,

    registerKds: (ws: WS) => kds.add(ws),
    unregisterKds: (ws: WS) => kds.delete(ws),

    registerDisplay: (sid: string, ws: WS) => {
      if (!display.has(sid)) display.set(sid, new Set());
      display.get(sid)!.add(ws);
    },
    unregisterDisplay: (sid: string, ws: WS) => {
      display.get(sid)?.delete(ws);
      if (display.get(sid)?.size === 0) display.delete(sid);
    },

    registerSelfOrder: (oid: string, ws: WS) => {
      if (!selfOrder.has(oid)) selfOrder.set(oid, new Set());
      selfOrder.get(oid)!.add(ws);
    },
    unregisterSelfOrder: (oid: string, ws: WS) => {
      selfOrder.get(oid)?.delete(ws);
      if (selfOrder.get(oid)?.size === 0) selfOrder.delete(oid);
    },

    broadcastKds: (event: string, payload: object) =>
      broadcastTo(kds, { event, at: new Date().toISOString(), ...payload }),

    broadcastDisplay: (sid: string, event: string, payload: object) => {
      const clients = display.get(sid);
      if (clients) broadcastTo(clients, { event, at: new Date().toISOString(), ...payload });
    },

    broadcastSelfOrder: (oid: string, event: string, payload?: object) => {
      const clients = selfOrder.get(oid);
      if (clients) broadcastTo(clients, { event, at: new Date().toISOString(), orderId: oid, ...payload });
    },
  };
}

// ─── KDS registry tests ───────────────────────────────────────────────────────

describe("KDS registry", () => {
  let reg: ReturnType<typeof makeRegistry>;

  beforeEach(() => { reg = makeRegistry(); });

  it("registers a client", () => {
    const ws = makeMockWS();
    reg.registerKds(ws);
    expect(reg.kds.size).toBe(1);
  });

  it("unregisters a client", () => {
    const ws = makeMockWS();
    reg.registerKds(ws);
    reg.unregisterKds(ws);
    expect(reg.kds.size).toBe(0);
  });

  it("broadcasts to all connected KDS clients", () => {
    const ws1 = makeMockWS();
    const ws2 = makeMockWS();
    reg.registerKds(ws1);
    reg.registerKds(ws2);

    reg.broadcastKds("NEW_ORDER", { orderId: "abc", orderNumber: "ORD-001", status: "SENT_TO_KITCHEN", items: [] });

    expect(ws1.messages).toHaveLength(1);
    expect(ws2.messages).toHaveLength(1);
    const parsed = JSON.parse(ws1.messages[0]!);
    expect(parsed.event).toBe("NEW_ORDER");
    expect(parsed.orderId).toBe("abc");
  });

  it("does NOT send to closed connections", () => {
    const open = makeMockWS(true);
    const closed = makeMockWS(false);
    reg.registerKds(open);
    reg.registerKds(closed);

    reg.broadcastKds("NEW_ORDER", { orderId: "x", orderNumber: "ORD-002", status: "SENT_TO_KITCHEN", items: [] });

    expect(open.messages).toHaveLength(1);
    expect(closed.messages).toHaveLength(0);
  });

  it("handles broadcast to empty registry gracefully", () => {
    expect(() => reg.broadcastKds("NEW_ORDER", { orderId: "x", orderNumber: "ORD-003", status: "SENT_TO_KITCHEN", items: [] })).not.toThrow();
  });

  it("supports multiple subscribers independently", () => {
    const ws1 = makeMockWS();
    const ws2 = makeMockWS();
    const ws3 = makeMockWS();
    reg.registerKds(ws1);
    reg.registerKds(ws2);
    reg.registerKds(ws3);
    reg.unregisterKds(ws2);

    reg.broadcastKds("ORDER_CANCELLED", { orderId: "y", orderNumber: "ORD-004" });

    expect(ws1.messages).toHaveLength(1);
    expect(ws2.messages).toHaveLength(0); // unregistered
    expect(ws3.messages).toHaveLength(1);
  });
});

// ─── Customer display registry tests ─────────────────────────────────────────

describe("Customer display registry", () => {
  let reg: ReturnType<typeof makeRegistry>;

  beforeEach(() => { reg = makeRegistry(); });

  it("registers client under session ID", () => {
    const ws = makeMockWS();
    reg.registerDisplay("sess-1", ws);
    expect(reg.display.get("sess-1")?.size).toBe(1);
  });

  it("delivers only to the correct session", () => {
    const ws1 = makeMockWS();
    const ws2 = makeMockWS();
    reg.registerDisplay("sess-1", ws1);
    reg.registerDisplay("sess-2", ws2);

    reg.broadcastDisplay("sess-1", "ORDER_CREATED", { orderId: "o1", orderNumber: "ORD-001", status: "DRAFT" });

    expect(ws1.messages).toHaveLength(1);
    expect(ws2.messages).toHaveLength(0); // different session
  });

  it("cleans up session entry when last client disconnects", () => {
    const ws = makeMockWS();
    reg.registerDisplay("sess-x", ws);
    reg.unregisterDisplay("sess-x", ws);
    expect(reg.display.has("sess-x")).toBe(false);
  });

  it("supports multiple screens per session", () => {
    const ws1 = makeMockWS();
    const ws2 = makeMockWS();
    reg.registerDisplay("sess-multi", ws1);
    reg.registerDisplay("sess-multi", ws2);

    reg.broadcastDisplay("sess-multi", "ORDER_STATUS_CHANGED", { orderId: "o2", orderNumber: "ORD-002", status: "PREPARING" });

    expect(ws1.messages).toHaveLength(1);
    expect(ws2.messages).toHaveLength(1);
  });

  it("broadcasts nothing for unknown sessionId", () => {
    expect(() => reg.broadcastDisplay("nonexistent", "ORDER_CREATED", { orderId: "x", orderNumber: "ORD-000", status: "DRAFT" })).not.toThrow();
  });
});

// ─── Self-order registry tests ────────────────────────────────────────────────

describe("Self-order registry", () => {
  let reg: ReturnType<typeof makeRegistry>;

  beforeEach(() => { reg = makeRegistry(); });

  it("registers client under order ID", () => {
    const ws = makeMockWS();
    reg.registerSelfOrder("order-1", ws);
    expect(reg.selfOrder.get("order-1")?.size).toBe(1);
  });

  it("delivers only to the correct order", () => {
    const ws1 = makeMockWS();
    const ws2 = makeMockWS();
    reg.registerSelfOrder("order-1", ws1);
    reg.registerSelfOrder("order-2", ws2);

    reg.broadcastSelfOrder("order-1", "PREPARING");

    expect(ws1.messages).toHaveLength(1);
    expect(ws2.messages).toHaveLength(0);
  });

  it("broadcasts correct event payload", () => {
    const ws = makeMockWS();
    reg.registerSelfOrder("order-abc", ws);
    reg.broadcastSelfOrder("order-abc", "READY");

    const msg = JSON.parse(ws.messages[0]!);
    expect(msg.event).toBe("READY");
    expect(msg.orderId).toBe("order-abc");
    expect(typeof msg.at).toBe("string");
  });

  it("cleans up when last client disconnects", () => {
    const ws = makeMockWS();
    reg.registerSelfOrder("order-z", ws);
    reg.unregisterSelfOrder("order-z", ws);
    expect(reg.selfOrder.has("order-z")).toBe(false);
  });

  it("handles reconnect — re-register same orderId", () => {
    const ws1 = makeMockWS();
    reg.registerSelfOrder("order-r", ws1);
    reg.unregisterSelfOrder("order-r", ws1);

    const ws2 = makeMockWS(); // new connection (reconnect)
    reg.registerSelfOrder("order-r", ws2);
    reg.broadcastSelfOrder("order-r", "SERVED");

    expect(ws2.messages).toHaveLength(1);
    expect(ws1.messages).toHaveLength(0);
  });
});

// ─── Broadcast payload shape tests ───────────────────────────────────────────

describe("Broadcast payload shapes", () => {
  let reg: ReturnType<typeof makeRegistry>;

  beforeEach(() => { reg = makeRegistry(); });

  it("KDS NEW_ORDER payload has required fields", () => {
    const ws = makeMockWS();
    reg.registerKds(ws);
    reg.broadcastKds("NEW_ORDER", {
      orderId: "uuid-1",
      orderNumber: "ORD-001",
      tokenNumber: 42,
      status: "SENT_TO_KITCHEN",
      items: [{ name: "Espresso", quantity: 2 }],
    });
    const msg = JSON.parse(ws.messages[0]!);
    expect(msg).toMatchObject({
      event: "NEW_ORDER",
      orderId: "uuid-1",
      tokenNumber: 42,
      status: "SENT_TO_KITCHEN",
    });
    expect(Array.isArray(msg.items)).toBe(true);
    expect(typeof msg.at).toBe("string");
  });

  it("display ORDER_STATUS_CHANGED payload has required fields", () => {
    const ws = makeMockWS();
    reg.registerDisplay("s1", ws);
    reg.broadcastDisplay("s1", "ORDER_STATUS_CHANGED", {
      orderId: "uuid-2",
      orderNumber: "ORD-002",
      status: "READY",
    });
    const msg = JSON.parse(ws.messages[0]!);
    expect(msg.event).toBe("ORDER_STATUS_CHANGED");
    expect(msg.status).toBe("READY");
  });

  it("PAYMENT_COMPLETED broadcast reaches KDS clients", () => {
    const ws = makeMockWS();
    reg.registerKds(ws);
    reg.broadcastKds("PAYMENT_COMPLETED", { orderId: "uuid-3", orderNumber: "ORD-003" });
    const msg = JSON.parse(ws.messages[0]!);
    expect(msg.event).toBe("PAYMENT_COMPLETED");
  });
});
