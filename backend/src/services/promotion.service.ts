import { eq, and, isNull, sql, or } from "drizzle-orm";
import { db } from "../db/index.ts";
import { promotions, orders, orderItems } from "../db/schema/index.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EligiblePromotion {
  id: bigint;
  publicId: string;
  name: string;
  type: string;
  discountValue: string;
  calculatedDiscount: number; // actual ₹ amount if applied
}

// ─── Validation (for the /coupons/validate endpoint — no side effects) ────────

export async function validateCoupon(
  code: string,
  orderId: bigint,
): Promise<{ valid: true; promotion: EligiblePromotion } | { valid: false; reason: string; code: string }> {
  const promo = await db.query.promotions.findFirst({
    where: (p, { and, eq, or }) =>
      and(
        eq(p.couponCode, code),
        or(eq(p.type, "COUPON_PERCENTAGE"), eq(p.type, "COUPON_FIXED")),
      ),
  });

  if (!promo) return { valid: false, reason: "COUPON_NOT_FOUND", code };
  if (promo.status !== "ACTIVE") return { valid: false, reason: "COUPON_INACTIVE", code };
  if (promo.expiresAt && promo.expiresAt < new Date())
    return { valid: false, reason: "COUPON_EXPIRED", code };
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses)
    return { valid: false, reason: "COUPON_MAX_USES_REACHED", code };

  // Check order eligibility (min order amount if set)
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) return { valid: false, reason: "ORDER_NOT_FOUND", code };

  const subtotal = Number(order.subtotal);
  if (promo.minOrderAmount && subtotal < Number(promo.minOrderAmount)) {
    return { valid: false, reason: "COUPON_NOT_ELIGIBLE", code };
  }

  const calculatedDiscount =
    promo.type === "COUPON_PERCENTAGE"
      ? (subtotal * Number(promo.discountValue)) / 100
      : Number(promo.discountValue);

  return {
    valid: true,
    promotion: {
      id: promo.id,
      publicId: promo.publicId,
      name: promo.name,
      type: promo.type,
      discountValue: promo.discountValue,
      calculatedDiscount: Math.min(calculatedDiscount, subtotal),
    },
  };
}

// ─── Get all eligible promotions for an order ─────────────────────────────────

export async function getEligiblePromotions(orderId: bigint): Promise<EligiblePromotion[]> {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: { columns: { productId: true, quantity: true } } },
  });
  if (!order) return [];

  const now = new Date();
  const subtotal = Number(order.subtotal);

  // Fetch all active auto promotions
  const autoPromos = await db.query.promotions.findMany({
    where: (p, { and, eq, or, isNull }) =>
      and(
        eq(p.status, "ACTIVE"),
        or(eq(p.type, "AUTO_PRODUCT_QTY"), eq(p.type, "AUTO_ORDER_AMOUNT")),
      ),
  });

  const eligible: EligiblePromotion[] = [];

  for (const promo of autoPromos) {
    // Check validity window
    if (promo.startsAt && promo.startsAt > now) continue;
    if (promo.expiresAt && promo.expiresAt < now) continue;
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) continue;

    if (promo.type === "AUTO_ORDER_AMOUNT") {
      if (!promo.minOrderAmount) continue;
      if (subtotal < Number(promo.minOrderAmount)) continue;
    }

    if (promo.type === "AUTO_PRODUCT_QTY") {
      if (!promo.triggerProductId || !promo.triggerQty) continue;
      const matchingItem = order.items.find(
        (i) => String(i.productId) === String(promo.triggerProductId),
      );
      if (!matchingItem || matchingItem.quantity < promo.triggerQty) continue;
    }

    // Both AUTO types store discountValue as a fixed monetary amount.
    // (Percentage-based auto promotions are not yet supported in the schema.)
    const calculatedDiscount = Math.min(Number(promo.discountValue), subtotal);

    eligible.push({
      id: promo.id,
      publicId: promo.publicId,
      name: promo.name,
      type: promo.type,
      discountValue: promo.discountValue,
      calculatedDiscount,
    });
  }

  return eligible;
}

// ─── Apply best automated promotion ──────────────────────────────────────────

export async function applyBestPromotion(orderId: bigint): Promise<void> {
  const eligible = await getEligiblePromotions(orderId);
  if (eligible.length === 0) {
    // Clear any existing auto promotion
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (order?.promotionId) {
      const promo = await db.query.promotions.findFirst({ where: eq(promotions.id, order.promotionId) });
      if (promo && (promo.type === "AUTO_PRODUCT_QTY" || promo.type === "AUTO_ORDER_AMOUNT")) {
        await db.update(orders)
          .set({ promotionId: null, discountAmount: "0.00", updatedAt: new Date() })
          .where(eq(orders.id, orderId));
      }
    }
    return;
  }

  // Pick the promotion that gives the highest discount
  const best = eligible.reduce((a, b) =>
    a.calculatedDiscount >= b.calculatedDiscount ? a : b,
  );

  await db.update(orders)
    .set({
      promotionId: best.id,
      discountAmount: String(best.calculatedDiscount.toFixed(2)),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));
}

// ─── Apply coupon (with side effect: updates order, increments usedCount) ────

export async function applyCoupon(orderId: bigint, code: string) {
  const result = await validateCoupon(code, orderId);
  if (!result.valid) return result;

  await db.transaction(async (tx) => {
    await tx.update(orders)
      .set({
        promotionId: result.promotion.id,
        discountAmount: String(result.promotion.calculatedDiscount.toFixed(2)),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    await tx.update(promotions)
      .set({ usedCount: sql`used_count + 1` })
      .where(eq(promotions.id, result.promotion.id));
  });

  return { valid: true, promotion: result.promotion };
}
