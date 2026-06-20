/**
 * Unit tests for order business logic — no DB required.
 * Tests the rules around DRAFT deletion and order state guards.
 *
 * Run: bun test src/tests/orders.test.ts
 */
import { describe, it, expect } from "bun:test";

// ─── Inline order-state guard logic (mirrors order.service.ts) ───────────────

type OrderStatus = "DRAFT" | "SENT_TO_KITCHEN" | "PREPARING" | "READY" | "PAID" | "CANCELLED";

interface Order {
  id: bigint;
  publicId: string;
  orderNumber: string;
  status: OrderStatus;
  tableId: bigint | null;
}

function canHardDelete(order: Order): { ok: true } | { ok: false; error: string } {
  if (order.status !== "DRAFT") return { ok: false, error: "ORDER_NOT_DRAFT" };
  return { ok: true };
}

function canCancel(order: Order): { ok: true } | { ok: false; error: string } {
  if (order.status === "PAID")      return { ok: false, error: "ORDER_ALREADY_PAID" };
  if (order.status === "CANCELLED") return { ok: false, error: "ORDER_CANCELLED" };
  if (order.status !== "DRAFT")     return { ok: false, error: "ORDER_NOT_DRAFT" };
  return { ok: true };
}

function makeOrder(status: OrderStatus, overrides: Partial<Order> = {}): Order {
  return {
    id: BigInt(1),
    publicId: "uuid-test",
    orderNumber: "ORD-001",
    status,
    tableId: null,
    ...overrides,
  };
}

// ─── DELETE /orders/:id — hard delete rules ───────────────────────────────────

describe("DELETE /orders/:id — hard delete", () => {
  it("allows deletion of DRAFT orders", () => {
    expect(canHardDelete(makeOrder("DRAFT")).ok).toBe(true);
  });

  it("rejects deletion of SENT_TO_KITCHEN orders", () => {
    const result = canHardDelete(makeOrder("SENT_TO_KITCHEN"));
    expect(result.ok).toBe(false);
    expect((result as any).error).toBe("ORDER_NOT_DRAFT");
  });

  it("rejects deletion of PREPARING orders", () => {
    const result = canHardDelete(makeOrder("PREPARING"));
    expect(result.ok).toBe(false);
    expect((result as any).error).toBe("ORDER_NOT_DRAFT");
  });

  it("rejects deletion of READY orders", () => {
    const result = canHardDelete(makeOrder("READY"));
    expect(result.ok).toBe(false);
    expect((result as any).error).toBe("ORDER_NOT_DRAFT");
  });

  it("rejects deletion of PAID orders", () => {
    const result = canHardDelete(makeOrder("PAID"));
    expect(result.ok).toBe(false);
    expect((result as any).error).toBe("ORDER_NOT_DRAFT");
  });

  it("rejects deletion of CANCELLED orders", () => {
    const result = canHardDelete(makeOrder("CANCELLED"));
    expect(result.ok).toBe(false);
    expect((result as any).error).toBe("ORDER_NOT_DRAFT");
  });
});

// ─── Cancel order rules ───────────────────────────────────────────────────────

describe("Cancel order guard", () => {
  it("allows cancelling a DRAFT order", () => {
    expect(canCancel(makeOrder("DRAFT")).ok).toBe(true);
  });

  it("rejects cancelling an already PAID order", () => {
    const result = canCancel(makeOrder("PAID"));
    expect(result.ok).toBe(false);
    expect((result as any).error).toBe("ORDER_ALREADY_PAID");
  });

  it("rejects cancelling an already CANCELLED order", () => {
    const result = canCancel(makeOrder("CANCELLED"));
    expect(result.ok).toBe(false);
    expect((result as any).error).toBe("ORDER_CANCELLED");
  });

  it("rejects cancelling a non-DRAFT order (SENT_TO_KITCHEN)", () => {
    const result = canCancel(makeOrder("SENT_TO_KITCHEN"));
    expect(result.ok).toBe(false);
    expect((result as any).error).toBe("ORDER_NOT_DRAFT");
  });
});

// ─── Order status transition map ─────────────────────────────────────────────

describe("Order status semantics", () => {
  const mutableStatuses: OrderStatus[] = ["DRAFT"];
  const immutableStatuses: OrderStatus[] = ["PAID", "CANCELLED"];
  const kitchenStatuses: OrderStatus[] = ["SENT_TO_KITCHEN", "PREPARING", "READY"];

  it("only DRAFT orders are hard-deletable", () => {
    const allStatuses: OrderStatus[] = [...mutableStatuses, ...immutableStatuses, ...kitchenStatuses];
    for (const s of allStatuses) {
      const result = canHardDelete(makeOrder(s));
      if (s === "DRAFT") {
        expect(result.ok).toBe(true);
      } else {
        expect(result.ok).toBe(false);
      }
    }
  });

  it("all non-DRAFT/non-terminal orders also cannot be hard-deleted", () => {
    for (const s of kitchenStatuses) {
      expect(canHardDelete(makeOrder(s)).ok).toBe(false);
    }
  });
});
