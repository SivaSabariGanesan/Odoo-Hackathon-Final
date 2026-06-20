/**
 * pos-core-stubs.ts
 *
 * Bridges self-order routes → real POS order service functions.
 * Replaces the original stub implementation with actual DB operations.
 */

import { db } from "../db/index.ts";
import { floorTables, products } from "../db/schema/index.ts";
import { eq } from "drizzle-orm";
import {
  getOrCreateDraftForTable as _getOrCreateDraftForTable,
  addItemToCart as _addItemToCart,
  updateCartItem as _updateCartItem,
  removeCartItem as _removeCartItem,
  applyCoupon as _applyCoupon,
  getEligiblePromotions as _getEligiblePromotions,
  calculateTotals as _calculateTotals,
  sendToKitchen as _sendToKitchen,
  getOrderById,
} from "./order.service.ts";
import { getEligiblePromotions } from "./promotion.service.ts";

export class PosCoreStubsService {
  /** Resolve a QR token to the floor_table row (null if not found/inactive). */
  async resolveTableByToken(token: string) {
    const [table] = await db
      .select()
      .from(floorTables)
      .where(eq(floorTables.qrToken, token))
      .limit(1);
    return table ?? null;
  }

  /**
   * Get or create a DRAFT order for the given tableId.
   * Returns the full order object (with items relation).
   */
  async getOrCreateDraftForTable(tableId: string | number) {
    const result = await _getOrCreateDraftForTable(BigInt(tableId), undefined, undefined);
    const order = result.order;

    // If freshly created, mark it as SELF_ORDER source
    if (result.created) {
      const { db } = await import("../db/index.ts");
      const { orders } = await import("../db/schema/index.ts");
      const { eq } = await import("drizzle-orm");
      await db.update(orders)
        .set({ source: "SELF_ORDER" })
        .where(eq(orders.id, BigInt((order as any).id)));
    }

    return order;
  }

  /** Add a product to the order cart. */
  async addItemToCart(
    orderId: number | bigint,
    dto: { productId: string; quantity: number; notes?: string },
  ) {
    // dto.productId is a public UUID — resolve to internal bigint ID
    const product = await db.query.products.findFirst({
      where: eq(products.publicId, dto.productId),
      columns: { id: true },
    });
    if (!product) throw Object.assign(new Error("Product not found"), { status: 404 });

    const result = await _addItemToCart(BigInt(orderId), {
      productId: product.id,
      quantity: dto.quantity,
      notes: dto.notes,
    });
    return result;
  }

  /** Update a cart item's quantity. itemId is the internal numeric ID. */
  async updateCartItem(
    orderId: number | bigint,
    itemId: number | bigint,
    dto: { quantity?: number },
  ) {
    return _updateCartItem(BigInt(orderId), BigInt(itemId), {
      quantity: dto.quantity ?? 1,
    });
  }

  /** Remove a cart item by its internal ID. */
  async removeCartItem(orderId: number | bigint, itemId: number | bigint) {
    return _removeCartItem(BigInt(orderId), BigInt(itemId));
  }

  /** Apply a coupon code to an order. */
  async applyCoupon(orderId: number | bigint, code: string) {
    return _applyCoupon(BigInt(orderId), code);
  }

  /** Get all auto-promotions currently eligible for an order. */
  async getEligiblePromotions(orderId: number | bigint) {
    return getEligiblePromotions(BigInt(orderId));
  }

  /** Recalculate and persist order totals. */
  async calculateTotals(orderId: number | bigint) {
    return _calculateTotals(BigInt(orderId));
  }

  /** Send unsent items to the KDS and mark order as SENT_TO_KITCHEN. */
  async sendToKitchen(orderId: number | bigint) {
    return _sendToKitchen(BigInt(orderId));
  }
}

export const posCoreStubs = new PosCoreStubsService();
