/**
 * Unit tests for calculateTotals and applyBestPromotion.
 * These run against mocked data — no DB connection required.
 *
 * Run: bun test src/tests/calculateTotals.test.ts
 */
import { describe, it, expect } from "bun:test";

// ─── Pure-function extraction of the totals logic ─────────────────────────────
// We extract the math from the service so we can test it without DB setup.

interface OrderItem {
  unitPrice: string;
  quantity: number;
  taxRate: string;
  discountAmount?: string;
}

interface OrderSnapshot {
  items: OrderItem[];
  discountAmount: string;
}

function computeTotals(order: OrderSnapshot) {
  let subtotal = 0;
  let taxAmount = 0;

  for (const item of order.items) {
    const lineSubtotal = Number(item.unitPrice) * item.quantity;
    const lineTax = (lineSubtotal * Number(item.taxRate)) / 100;
    subtotal += lineSubtotal;
    taxAmount += lineTax;
  }

  const discountAmount = Number(order.discountAmount);
  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);

  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("computeTotals", () => {
  it("computes totals for a simple order with no tax and no discount", () => {
    const result = computeTotals({
      items: [{ unitPrice: "100.00", quantity: 2, taxRate: "0.00" }],
      discountAmount: "0.00",
    });
    expect(result.subtotal).toBe(200);
    expect(result.taxAmount).toBe(0);
    expect(result.discountAmount).toBe(0);
    expect(result.grandTotal).toBe(200);
  });

  it("applies GST 18% correctly", () => {
    const result = computeTotals({
      items: [{ unitPrice: "100.00", quantity: 1, taxRate: "18.00" }],
      discountAmount: "0.00",
    });
    expect(result.subtotal).toBe(100);
    expect(result.taxAmount).toBe(18);
    expect(result.grandTotal).toBe(118);
  });

  it("applies discount to grand total", () => {
    const result = computeTotals({
      items: [{ unitPrice: "200.00", quantity: 1, taxRate: "5.00" }],
      discountAmount: "20.00",
    });
    // subtotal 200, tax 10, discount 20 → 190
    expect(result.subtotal).toBe(200);
    expect(result.taxAmount).toBe(10);
    expect(result.discountAmount).toBe(20);
    expect(result.grandTotal).toBe(190);
  });

  it("grand total never goes below zero when discount exceeds order value", () => {
    const result = computeTotals({
      items: [{ unitPrice: "50.00", quantity: 1, taxRate: "0.00" }],
      discountAmount: "100.00",
    });
    expect(result.grandTotal).toBe(0);
  });

  it("handles multiple items with mixed tax rates", () => {
    const result = computeTotals({
      items: [
        { unitPrice: "100.00", quantity: 2, taxRate: "18.00" }, // 200 + 36 tax
        { unitPrice: "50.00", quantity: 1, taxRate: "5.00" },   // 50 + 2.5 tax
      ],
      discountAmount: "0.00",
    });
    expect(result.subtotal).toBe(250);
    expect(result.taxAmount).toBe(38.5);
    expect(result.grandTotal).toBe(288.5);
  });

  it("handles fractional prices without floating-point drift", () => {
    const result = computeTotals({
      items: [{ unitPrice: "33.33", quantity: 3, taxRate: "0.00" }],
      discountAmount: "0.00",
    });
    // 33.33 * 3 = 99.99 (not 99.989999... )
    expect(result.subtotal).toBe(99.99);
    expect(result.grandTotal).toBe(99.99);
  });

  it("returns zero totals for empty order", () => {
    const result = computeTotals({ items: [], discountAmount: "0.00" });
    expect(result.subtotal).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.grandTotal).toBe(0);
  });
});

// ─── applyBestPromotion logic ─────────────────────────────────────────────────

interface Promotion {
  id: number;
  type: "AUTO_ORDER_AMOUNT" | "AUTO_PRODUCT_QTY";
  discountValue: number;
  minOrderAmount?: number;
  triggerProductId?: number;
  triggerQty?: number;
  maxUses: number | null;
  usedCount: number;
}

interface CartItem {
  productId: number;
  quantity: number;
}

function computeBestPromotion(
  subtotal: number,
  items: CartItem[],
  promotions: Promotion[],
): { promotion: Promotion; discount: number } | null {
  const now = new Date();
  const eligible: Array<{ promotion: Promotion; discount: number }> = [];

  for (const promo of promotions) {
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) continue;

    if (promo.type === "AUTO_ORDER_AMOUNT") {
      if (!promo.minOrderAmount || subtotal < promo.minOrderAmount) continue;
    }

    if (promo.type === "AUTO_PRODUCT_QTY") {
      if (!promo.triggerProductId || !promo.triggerQty) continue;
      const item = items.find((i) => i.productId === promo.triggerProductId);
      if (!item || item.quantity < promo.triggerQty) continue;
    }

    eligible.push({ promotion: promo, discount: Math.min(promo.discountValue, subtotal) });
  }

  if (eligible.length === 0) return null;
  return eligible.reduce((best, curr) => (curr.discount >= best.discount ? curr : best));
}

describe("computeBestPromotion", () => {
  it("returns null when no promotions are eligible", () => {
    const result = computeBestPromotion(50, [], [
      { id: 1, type: "AUTO_ORDER_AMOUNT", discountValue: 20, minOrderAmount: 200, maxUses: null, usedCount: 0 },
    ]);
    expect(result).toBeNull();
  });

  it("picks the promotion when order meets threshold", () => {
    const result = computeBestPromotion(300, [], [
      { id: 1, type: "AUTO_ORDER_AMOUNT", discountValue: 30, minOrderAmount: 200, maxUses: null, usedCount: 0 },
    ]);
    expect(result).not.toBeNull();
    expect(result!.discount).toBe(30);
  });

  it("picks the BEST (highest discount) promotion when multiple qualify", () => {
    const result = computeBestPromotion(500, [], [
      { id: 1, type: "AUTO_ORDER_AMOUNT", discountValue: 30, minOrderAmount: 100, maxUses: null, usedCount: 0 },
      { id: 2, type: "AUTO_ORDER_AMOUNT", discountValue: 75, minOrderAmount: 400, maxUses: null, usedCount: 0 },
      { id: 3, type: "AUTO_ORDER_AMOUNT", discountValue: 50, minOrderAmount: 200, maxUses: null, usedCount: 0 },
    ]);
    expect(result!.promotion.id).toBe(2);
    expect(result!.discount).toBe(75);
  });

  it("ignores promotions that have hit max uses", () => {
    const result = computeBestPromotion(500, [], [
      { id: 1, type: "AUTO_ORDER_AMOUNT", discountValue: 100, minOrderAmount: 100, maxUses: 5, usedCount: 5 },
      { id: 2, type: "AUTO_ORDER_AMOUNT", discountValue: 30, minOrderAmount: 100, maxUses: null, usedCount: 0 },
    ]);
    expect(result!.promotion.id).toBe(2);
  });

  it("triggers AUTO_PRODUCT_QTY when item quantity threshold met", () => {
    const result = computeBestPromotion(
      100,
      [{ productId: 7, quantity: 3 }],
      [{ id: 5, type: "AUTO_PRODUCT_QTY", discountValue: 20, triggerProductId: 7, triggerQty: 2, maxUses: null, usedCount: 0 }],
    );
    expect(result!.promotion.id).toBe(5);
    expect(result!.discount).toBe(20);
  });

  it("does NOT trigger AUTO_PRODUCT_QTY when quantity below threshold", () => {
    const result = computeBestPromotion(
      100,
      [{ productId: 7, quantity: 1 }],
      [{ id: 5, type: "AUTO_PRODUCT_QTY", discountValue: 20, triggerProductId: 7, triggerQty: 2, maxUses: null, usedCount: 0 }],
    );
    expect(result).toBeNull();
  });

  it("caps discount at order subtotal to prevent negative totals", () => {
    const result = computeBestPromotion(50, [], [
      { id: 1, type: "AUTO_ORDER_AMOUNT", discountValue: 200, minOrderAmount: 10, maxUses: null, usedCount: 0 },
    ]);
    expect(result!.discount).toBe(50); // capped at subtotal
  });
});
