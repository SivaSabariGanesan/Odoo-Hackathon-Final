import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { orders, orderItems, kitchenTickets, kitchenTicketItems, payments, receipts } from "../db/schema/index.ts";
import { emit } from "../utils/events.ts";
import { applyBestPromotion, calculatePromotionDiscount } from "./promotion.service.ts";
import { emitTableOccupancyChanged } from "./floor.service.ts";
import { generateOrderNumber } from "../utils/orderNumber.ts";
import {
  broadcastOrderCreated,
  broadcastOrderUpdated,
  broadcastOrderCancelled,
  broadcastPaymentCompleted,
} from "./realtime.service.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  tableId?: bigint;
  sessionId?: bigint;
  customerId?: bigint;
  source?: "POS" | "SELF_ORDER";
  type?: "DINE_IN" | "TAKEAWAY";
  staffId?: bigint;
  guestName?: string;
}

// ─── Totals calculation ───────────────────────────────────────────────────────
// Single source of truth — called after every cart mutation.

export async function calculateTotals(orderId: bigint) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true, promotion: true },
  });
  if (!order) return null;

  let subtotal = 0;
  let taxAmount = 0;

  for (const item of order.items) {
    const lineSubtotal = Number(item.unitPrice) * item.quantity;
    const lineTax = (lineSubtotal * Number(item.taxRate)) / 100;
    subtotal += lineSubtotal;
    taxAmount += lineTax;
  }

  let discountAmount = Number(order.discountAmount);
  let promotionId = order.promotionId;

  if (order.promotion) {
    const recalculated = calculatePromotionDiscount(
      order.promotion,
      subtotal,
      order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    );
    if (recalculated === null) {
      discountAmount = 0;
      promotionId = null;
    } else {
      discountAmount = recalculated;
    }
  }

  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);

  await db.update(orders)
    .set({
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      promotionId,
      grandTotal: grandTotal.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  return { subtotal, taxAmount, discountAmount, grandTotal };
}

// ─── Create order ─────────────────────────────────────────────────────────────

export async function createOrder(input: CreateOrderInput) {
  const orderNumber = await generateOrderNumber();

  const [order] = await db.insert(orders).values({
    orderNumber,
    sessionId: input.sessionId,
    tableId: input.tableId,
    customerId: input.customerId,
    staffId: input.staffId,
    source: input.source ?? "POS",
    type: input.type ?? "DINE_IN",
    status: "DRAFT",
    guestName: input.guestName,
  }).returning();

  if (!order) throw new Error("Order insert returned no rows");

  if (input.tableId) {
    await emitTableOccupancyChanged(input.tableId, true);
  }

  emit("order_state_changed", { orderId: order.publicId, status: "DRAFT", event: "created" });

  return order;
}

// ─── Get or create draft for table (idempotent) ───────────────────────────────

export async function getOrCreateDraftForTable(
  tableId: bigint,
  sessionId?: bigint,
  staffId?: bigint,
) {
  const existing = await db.query.orders.findFirst({
    where: and(eq(orders.tableId, tableId), eq(orders.status, "DRAFT")),
    with: { items: { with: { product: { columns: { id: true, name: true, publicId: true } } } } },
  });

  if (existing) return { order: existing, created: false };

  const created = await createOrder({ tableId, sessionId, staffId, type: "DINE_IN" });
  const full = await getOrderById(created.id);
  return { order: full, created: true };
}

// ─── Get order ────────────────────────────────────────────────────────────────

export async function getOrderById(orderId: bigint) {
  return db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      items: {
        with: { product: { columns: { id: true, publicId: true, name: true, imageUrl: true } } },
      },
      table: { with: { floor: { columns: { name: true } } } },
      customer: { columns: { publicId: true, name: true, phone: true } },
      promotion: { columns: { publicId: true, name: true, type: true, discountValue: true } },
    },
  });
}

export async function getOrderByPublicId(publicId: string) {
  return db.query.orders.findFirst({
    where: eq(orders.publicId, publicId),
    with: {
      items: {
        with: { product: { columns: { id: true, publicId: true, name: true, imageUrl: true } } },
      },
      table: { with: { floor: { columns: { name: true } } } },
      customer: { columns: { publicId: true, name: true, phone: true } },
      promotion: { columns: { publicId: true, name: true, type: true, discountValue: true } },
    },
  });
}

// ─── Guard: only DRAFT orders are mutable ────────────────────────────────────

async function requireDraft(orderId: bigint) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) return { error: "NOT_FOUND" as const };
  if (order.status === "PAID") return { error: "ORDER_ALREADY_PAID" as const };
  if (order.status === "CANCELLED") return { error: "ORDER_CANCELLED" as const };
  if (order.status !== "DRAFT") return { error: "ORDER_NOT_DRAFT" as const };
  return { order };
}

// ─── Add item to cart ─────────────────────────────────────────────────────────

export async function addItemToCart(
  orderId: bigint,
  input: { productId: bigint; quantity: number; notes?: string },
) {
  const guard = await requireDraft(orderId);
  if ("error" in guard) return guard;

  const product = await db.query.products.findFirst({
    where: (p, { and: a, eq: e, isNull: n }) => a(e(p.id, input.productId), n(p.deletedAt)),
  });
  if (!product) return { error: "NOT_FOUND" as const };
  if (!product.isAvailable) return { error: "PRODUCT_UNAVAILABLE" as const };

  // Merge into existing line item if present
  const existingItem = await db.query.orderItems.findFirst({
    where: and(eq(orderItems.orderId, orderId), eq(orderItems.productId, input.productId)),
  });

  let item;
  if (existingItem) {
    const newQty = existingItem.quantity + input.quantity;
    const taxAmt = (Number(product.price) * newQty * Number(product.taxRate)) / 100;
    const lineTotal = Number(product.price) * newQty + taxAmt;
    [item] = await db.update(orderItems)
      .set({ quantity: newQty, taxAmount: taxAmt.toFixed(2), lineTotal: lineTotal.toFixed(2), updatedAt: new Date() })
      .where(eq(orderItems.id, existingItem.id))
      .returning();
  } else {
    const taxAmt = (Number(product.price) * input.quantity * Number(product.taxRate)) / 100;
    const lineTotal = Number(product.price) * input.quantity + taxAmt;
    [item] = await db.insert(orderItems).values({
      orderId,
      productId: product.id,
      productName: product.name,
      quantity: input.quantity,
      unitPrice: product.price,
      taxRate: product.taxRate,
      taxAmount: taxAmt.toFixed(2),
      lineTotal: lineTotal.toFixed(2),
      notes: input.notes,
      kitchenState: "TO_COOK",
    }).returning();
  }

  await applyBestPromotion(orderId);
  await calculateTotals(orderId);

  const updatedOrder = await getOrderById(orderId);
  emit("order_state_changed", { orderId: guard.order.publicId, event: "item_added" });

  return { item, order: updatedOrder };
}

// ─── Update cart item ─────────────────────────────────────────────────────────

export async function updateCartItem(
  orderId: bigint,
  itemId: bigint,
  input: { quantity: number },
) {
  const guard = await requireDraft(orderId);
  if ("error" in guard) return guard;

  const item = await db.query.orderItems.findFirst({
    where: and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)),
  });
  if (!item) return { error: "NOT_FOUND" as const };
  if (item.kitchenState === "PREPARING" || item.kitchenState === "COMPLETED") {
    return { error: "ITEM_LOCKED_BY_KDS" as const };
  }

  const taxAmt = (Number(item.unitPrice) * input.quantity * Number(item.taxRate)) / 100;
  const lineTotal = Number(item.unitPrice) * input.quantity + taxAmt;

  const [updated] = await db.update(orderItems)
    .set({ quantity: input.quantity, taxAmount: taxAmt.toFixed(2), lineTotal: lineTotal.toFixed(2), updatedAt: new Date() })
    .where(eq(orderItems.id, itemId))
    .returning();

  await applyBestPromotion(orderId);
  await calculateTotals(orderId);

  const updatedOrder = await getOrderById(orderId);
  emit("order_state_changed", { orderId: guard.order.publicId, event: "item_updated" });

  return { item: updated, order: updatedOrder };
}

// ─── Remove cart item ─────────────────────────────────────────────────────────

export async function removeCartItem(orderId: bigint, itemId: bigint) {
  const guard = await requireDraft(orderId);
  if ("error" in guard) return guard;

  const item = await db.query.orderItems.findFirst({
    where: and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)),
  });
  if (!item) return { error: "NOT_FOUND" as const };
  if (item.kitchenState === "PREPARING" || item.kitchenState === "COMPLETED") {
    return { error: "ITEM_LOCKED_BY_KDS" as const };
  }

  await db.delete(orderItems).where(eq(orderItems.id, itemId));

  await applyBestPromotion(orderId);
  await calculateTotals(orderId);

  const updatedOrder = await getOrderById(orderId);
  emit("order_state_changed", { orderId: guard.order.publicId, event: "item_removed" });

  return { order: updatedOrder };
}

// ─── Apply coupon (wraps promotion service + recalculates totals) ─────────────

export async function applyCoupon(orderId: bigint, code: string) {
  const guard = await requireDraft(orderId);
  if ("error" in guard) return guard;

  const { applyCoupon: applyCouponPromo } = await import("./promotion.service.ts");
  const result = await applyCouponPromo(orderId, code);
  if (!result.valid) return result;

  await calculateTotals(orderId);
  const updatedOrder = await getOrderById(orderId);
  emit("order_state_changed", { orderId: guard.order.publicId, event: "coupon_applied" });

  return { valid: true as const, order: updatedOrder };
}

// ─── Attach customer to order ─────────────────────────────────────────────────

export async function attachCustomer(orderId: bigint, customerId: bigint | null) {
  const guard = await requireDraft(orderId);
  if ("error" in guard) return guard;

  const [updated] = await db.update(orders)
    .set({ customerId, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  emit("order_state_changed", { orderId: guard.order.publicId, event: "customer_attached" });
  return { order: updated };
}

// ─── Send to kitchen ──────────────────────────────────────────────────────────

export async function sendToKitchen(orderId: bigint) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true, table: { with: { floor: true } } },
  });
  if (!order) return { error: "NOT_FOUND" as const };
  if (order.status === "PAID" || order.status === "CANCELLED") {
    return { error: "ORDER_NOT_DRAFT" as const };
  }

  const unsent = order.items.filter((i) => i.kitchenState === "TO_COOK");
  if (unsent.length === 0) return { error: "NO_UNSENT_ITEMS" as const };

  // Get next ticket number for this order
  const ticketCountRes = await db
    .select({ maxTicket: sql<number>`COALESCE(MAX(ticket_number), 0)::int` })
    .from(kitchenTickets)
    .where(eq(kitchenTickets.orderId, orderId));

  const ticketNumber = (ticketCountRes[0]?.maxTicket ?? 0) + 1;
  const tableLabel = order.table
    ? `${order.table.tableNumber} / ${(order.table as any).floor?.name ?? ""}`
    : null;

  const [ticket] = await db.insert(kitchenTickets).values({
    orderId,
    tableId: order.tableId,
    ticketNumber,
    tableLabel,
    orderType: order.type,
    notes: order.notes,
    status: "PENDING",
  }).returning();

  if (!ticket) throw new Error("KDS ticket insert returned no rows");

  for (const item of unsent) {
    await db.insert(kitchenTicketItems).values({
      ticketId: ticket.id,
      orderItemId: item.id,
      productName: item.productName,
      quantity: item.quantity,
      notes: item.notes,
      state: "TO_COOK",
    });

    await db.update(orderItems)
      .set({ kitchenState: "PREPARING", updatedAt: new Date() })
      .where(eq(orderItems.id, item.id));
  }

  await db.update(orders)
    .set({ status: "SENT_TO_KITCHEN", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  emit("kds_ticket_pushed", {
    ticketId: ticket.publicId,
    ticketNumber,
    orderId: order.publicId,
    orderNumber: order.orderNumber,
    tableLabel,
    items: unsent.map((i) => ({ name: i.productName, quantity: i.quantity })),
  });

  // Broadcast to connected KDS clients
  broadcastOrderCreated({
    orderId: order.publicId,
    orderNumber: order.orderNumber,
    tokenNumber: order.tokenNumber,
    tableLabel,
    status: "SENT_TO_KITCHEN",
    items: unsent.map((i) => ({ name: i.productName, quantity: i.quantity, notes: i.notes })),
  });

  return { ticket };
}

// ─── Mark order paid (entry point for Siva's payment module) ─────────────────

export async function markOrderPaid(
  orderId: bigint,
  paymentDetails: { methodId: bigint; amount: number; transactionRef?: string },
) {
  return db.transaction(async (tx) => {
    // Row-level lock prevents concurrent double-payment
    const lockResult = await tx.execute(
      sql`SELECT id, status, table_id, public_id, grand_total FROM orders WHERE id = ${orderId} FOR UPDATE`,
    );
    const lockedOrder = lockResult.rows[0] as
      | { id: bigint; status: string; table_id: bigint | null; public_id: string; grand_total: string }
      | undefined;

    if (!lockedOrder) return { error: "NOT_FOUND" as const };
    if (lockedOrder.status === "PAID") return { error: "ORDER_ALREADY_PAID" as const };
    if (lockedOrder.status === "CANCELLED") return { error: "ORDER_CANCELLED" as const };

    // Enforce single payment logic per order for now
    const existingPaymentsRes = await tx.execute(
      sql`SELECT id FROM payments WHERE order_id = ${orderId} LIMIT 1`
    );
    if (existingPaymentsRes.rows.length > 0) {
      return { error: "PAYMENT_ALREADY_RECORDED" as const };
    }

    const grandTotal = Number(lockedOrder.grand_total);
    const tenderedAmount = paymentDetails.amount;
    if (tenderedAmount < grandTotal) {
      return { error: "INSUFFICIENT_PAYMENT" as const };
    }

    const changeAmount = tenderedAmount - grandTotal;

    // Write to payments table
    await tx.insert(payments).values({
      orderId,
      methodId: paymentDetails.methodId,
      amount: tenderedAmount.toFixed(2),
      changeAmount: changeAmount.toFixed(2),
      transactionRef: paymentDetails.transactionRef,
      status: "COMPLETED",
      paidAt: new Date(),
    });

    // Flip order status
    await tx.update(orders)
      .set({ status: "PAID", paidAt: new Date(), updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    await tx.update(kitchenTickets)
      .set({ status: "COMPLETED", completedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(kitchenTickets.orderId, orderId), sql`status != 'CANCELLED'`));

    emit("order_completed", {
      orderId: lockedOrder.public_id,
      paidAt: new Date().toISOString(),
    });

    // Broadcast payment completion to KDS clients
    broadcastPaymentCompleted(lockedOrder.public_id as string, "");

    if (lockedOrder.table_id) {
      await emitTableOccupancyChanged(BigInt(lockedOrder.table_id), false);
    }

    return { success: true as const };
  });
}

// ─── Cancel order ─────────────────────────────────────────────────────────────

export async function cancelOrder(orderId: bigint, reason?: string) {
  const guard = await requireDraft(orderId);
  if ("error" in guard) return guard;

  const [updated] = await db.update(orders)
    .set({ status: "CANCELLED", cancelReason: reason, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  if (guard.order.tableId) {
    await emitTableOccupancyChanged(guard.order.tableId, false);
  }

  emit("order_state_changed", { orderId: guard.order.publicId, status: "CANCELLED", event: "cancelled" });

  broadcastOrderCancelled(guard.order.publicId, guard.order.orderNumber);

  return { order: updated };
}

// ─── List orders ──────────────────────────────────────────────────────────────

export async function listOrders(params: {
  sessionId?: bigint;
  tableId?: bigint;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const { page = 1, pageSize = 20 } = params;
  const offset = (page - 1) * pageSize;

  const rows = await db.query.orders.findMany({
    where: (o, { and: a, eq: e }) => {
      const conditions: ReturnType<typeof e>[] = [];
      if (params.sessionId) conditions.push(e(o.sessionId, params.sessionId));
      if (params.tableId) conditions.push(e(o.tableId, params.tableId));
      if (params.status) conditions.push(e(o.status, params.status as any));
      return conditions.length > 0 ? a(...(conditions as [any, ...any[]])) : undefined;
    },
    with: {
      table: { columns: { tableNumber: true, publicId: true } },
      customer: { columns: { name: true, publicId: true } },
    },
    orderBy: (o, { desc }) => [desc(o.createdAt)],
    limit: pageSize,
    offset,
  });

  const countRes = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(orders);

  return { rows, total: countRes[0]?.total ?? 0 };
}

// ─── Hard-delete DRAFT order ──────────────────────────────────────────────────

export async function deleteDraftOrder(orderId: bigint) {
  return db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({
      where: eq(orders.id, orderId),
      columns: { id: true, status: true, publicId: true, orderNumber: true, tableId: true },
    });

    if (!order) return { error: "NOT_FOUND" as const };
    if (order.status !== "DRAFT") return { error: "ORDER_NOT_DRAFT" as const };

    // Remove line items first (cascade should handle it, but be explicit)
    await tx.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await tx.delete(orders).where(eq(orders.id, orderId));

    // Audit log entry
    const { auditLogs } = await import("../db/schema/index.ts");
    await tx.insert(auditLogs).values({
      action: "DELETE",
      entityType: "order",
      entityId: orderId,
      description: `Hard-deleted DRAFT order ${order.orderNumber}`,
    });

    if (order.tableId) {
      await emitTableOccupancyChanged(order.tableId, false);
    }

    emit("order_state_changed", { orderId: order.publicId, status: "DELETED", event: "deleted" });

    return { deleted: true as const };
  });
}
