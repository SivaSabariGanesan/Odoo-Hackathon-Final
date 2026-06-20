import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { authorize } from "../middleware/authorize.ts";
import { db } from "../db/index.ts";
import { orders, floorTables, posSessions, orderItems, customers, products } from "../db/schema/index.ts";
import { eq } from "drizzle-orm";
import * as svc from "../services/order.service.ts";
import * as receiptSvc from "../services/receipt.service.ts";
import { ok, created, notFound, conflict, badRequest, err } from "../utils/response.ts";

const ErrorResponse = z.object({ success: z.literal(false), error: z.object({ code: z.string(), message: z.string() }) });

const OrderResponse = z.object({
  id: z.any(), publicId: z.string().uuid(), orderNumber: z.string(),
  status: z.enum(["DRAFT", "SENT_TO_KITCHEN", "PREPARING", "READY", "PAYMENT_PENDING", "PAID", "CANCELLED"]),
  type: z.enum(["DINE_IN", "TAKEAWAY"]), source: z.enum(["POS", "SELF_ORDER"]),
  subtotal: z.string(), taxAmount: z.string(), discountAmount: z.string(), grandTotal: z.string(),
}).passthrough();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveOrderId(publicId: string) {
  const o = await db.query.orders.findFirst({ where: eq(orders.publicId, publicId), columns: { id: true } });
  return o?.id ?? null;
}

function mapError(c: any, error: string | undefined) {
  const code = error ?? "INTERNAL_ERROR";
  if (code === "NOT_FOUND") return notFound(c, "Resource not found");
  if (code === "ORDER_ALREADY_PAID") return conflict(c, code, "Order has already been paid");
  if (code === "ORDER_NOT_PAID") return conflict(c, code, "Order is not paid");
  if (code === "ORDER_CANCELLED") return conflict(c, code, "Order is cancelled");
  if (code === "ORDER_NOT_DRAFT") return conflict(c, code, "Order is not in DRAFT state");
  if (code === "ITEM_LOCKED_BY_KDS") return conflict(c, code, "Item is being prepared in the kitchen");
  if (code === "PRODUCT_UNAVAILABLE") return conflict(c, code, "Product is not available");
  if (code === "NO_UNSENT_ITEMS") return badRequest(c, "No new items to send to kitchen");
  if (code === "PAYMENT_ALREADY_RECORDED") return conflict(c, code, "Payment already recorded");
  if (code === "INSUFFICIENT_PAYMENT") return badRequest(c, "Payment amount is less than grand total");
  return err(c, 500, "INTERNAL_ERROR", code);
}

const router = createRouter();

// All order routes require authentication
router.use("/orders",                        authenticate, authorize(["ADMIN", "CASHIER"]));
router.use("/orders/*",                      authenticate, authorize(["ADMIN", "CASHIER"]));

// GET /orders
router.openapi(
  createRoute({
    method: "get", path: "/orders",
    tags: ["Orders"],
    summary: "List orders with optional filters",
    request: {
      query: z.object({
        sessionId: z.string().uuid().optional(),
        tableId: z.string().uuid().optional(),
        status: z.enum(["DRAFT", "SENT_TO_KITCHEN", "PREPARING", "READY", "PAID", "CANCELLED"]).optional(),
        page: z.string().optional(),
        pageSize: z.string().optional(),
      }),
    },
    responses: { 200: { description: "Orders", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.array(OrderResponse) }) } } } },
  }),
  async (c) => {
    const { sessionId, tableId, status, page, pageSize } = c.req.valid("query");
    let sessionInternalId: bigint | undefined;
    let tableInternalId: bigint | undefined;
    if (sessionId) {
      const s = await db.query.posSessions.findFirst({ where: eq(posSessions.publicId, sessionId), columns: { id: true } });
      sessionInternalId = s?.id;
    }
    if (tableId) {
      const t = await db.query.floorTables.findFirst({ where: eq(floorTables.publicId, tableId), columns: { id: true } });
      tableInternalId = t?.id;
    }
    const result = await svc.listOrders({ sessionId: sessionInternalId, tableId: tableInternalId, status, page: page ? Number(page) : undefined, pageSize: pageSize ? Number(pageSize) : undefined });
    return ok(c, result.rows);
  },
);

// GET /orders/:id
router.openapi(
  createRoute({
    method: "get", path: "/orders/{id}",
    tags: ["Orders"],
    summary: "Get a full order with items, table, customer, and promotion",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Order", content: { "application/json": { schema: z.object({ success: z.literal(true), data: OrderResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const order = await svc.getOrderByPublicId(c.req.param("id"));
    if (!order) return notFound(c, "Order not found") as any;
    return ok(c, order);
  },
);

// POST /orders
router.openapi(
  createRoute({
    method: "post", path: "/orders",
    tags: ["Orders"],
    summary: "Create a new order",
    request: {
      body: {
        content: { "application/json": { schema: z.object({
          tableId: z.string().uuid().optional(),
          sessionId: z.string().uuid().optional(),
          customerId: z.string().uuid().optional(),
          source: z.enum(["POS", "SELF_ORDER"]).optional(),
          type: z.enum(["DINE_IN", "TAKEAWAY"]).optional(),
          guestName: z.string().max(100).optional(),
        }) } },
        required: true,
      },
    },
    responses: {
      201: { description: "Created", content: { "application/json": { schema: z.object({ success: z.literal(true), data: OrderResponse }) } } },
      404: { description: "Table or session not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const input = c.req.valid("json");
    const user = c.get("user");
    let tableId: bigint | undefined;
    let sessionId: bigint | undefined;
    if (input.tableId) {
      const t = await db.query.floorTables.findFirst({ where: eq(floorTables.publicId, input.tableId), columns: { id: true } });
      if (!t) return notFound(c, "Table not found") as any;
      tableId = t.id;
    }
    if (input.sessionId) {
      const s = await db.query.posSessions.findFirst({ where: eq(posSessions.publicId, input.sessionId), columns: { id: true } });
      sessionId = s?.id;
    }
    const order = await svc.createOrder({ tableId, sessionId, source: input.source, type: input.type, staffId: user ? BigInt(user.id) : undefined, guestName: input.guestName });
    return created(c, order);
  },
);

// POST /orders/table/:tableId/draft
router.openapi(
  createRoute({
    method: "post", path: "/orders/table/{tableId}/draft",
    tags: ["Orders"],
    summary: "Get or create a draft order for a table (idempotent)",
    description: "Returns the existing DRAFT order if one exists, otherwise creates a new one.",
    request: { params: z.object({ tableId: z.string().uuid() }) },
    responses: {
      200: { description: "Draft order", content: { "application/json": { schema: z.object({ success: z.literal(true), data: OrderResponse }) } } },
      404: { description: "Table not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const user = c.get("user");
    const t = await db.query.floorTables.findFirst({ where: eq(floorTables.publicId, c.req.param("tableId")), columns: { id: true } });
    if (!t) return notFound(c, "Table not found") as any;
    const result = await svc.getOrCreateDraftForTable(t.id, undefined, user ? BigInt(user.id) : undefined);
    return ok(c, result.order);
  },
);

// POST /orders/:id/items
router.openapi(
  createRoute({
    method: "post", path: "/orders/{id}/items",
    tags: ["Orders"],
    summary: "Add an item to an order cart",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { "application/json": { schema: z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).openapi({ example: 2 }), notes: z.string().optional() }) } }, required: true },
    },
    responses: {
      200: { description: "Updated order", content: { "application/json": { schema: z.object({ success: z.literal(true), data: OrderResponse }) } } },
      404: { description: "Order or product not found", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Order not mutable", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const orderId = await resolveOrderId(c.req.param("id"));
    if (!orderId) return notFound(c, "Order not found") as any;
    const input = c.req.valid("json");
    const p = await db.query.products.findFirst({ where: eq(products.publicId, input.productId), columns: { id: true } });
    if (!p) return notFound(c, "Product not found") as any;
    const result = await svc.addItemToCart(orderId, { productId: p.id, quantity: input.quantity, notes: input.notes });
    if ("error" in result) return mapError(c, result.error) as any;
    return ok(c, result.order);
  },
);

// PATCH /orders/:id/items/:itemId
router.openapi(
  createRoute({
    method: "patch", path: "/orders/{id}/items/{itemId}",
    tags: ["Orders"],
    summary: "Update the quantity of a cart item",
    request: {
      params: z.object({ id: z.string().uuid(), itemId: z.string().uuid() }),
      body: { content: { "application/json": { schema: z.object({ quantity: z.number().int().min(1) }) } }, required: true },
    },
    responses: {
      200: { description: "Updated order", content: { "application/json": { schema: z.object({ success: z.literal(true), data: OrderResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Locked by KDS or order not mutable", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const orderId = await resolveOrderId(c.req.param("id"));
    if (!orderId) return notFound(c, "Order not found") as any;
    const item = await db.query.orderItems.findFirst({ where: eq(orderItems.publicId, c.req.param("itemId")), columns: { id: true } });
    if (!item) return notFound(c, "Order item not found") as any;
    const result = await svc.updateCartItem(orderId, item.id, c.req.valid("json"));
    if ("error" in result) return mapError(c, result.error) as any;
    return ok(c, result.order);
  },
);

// DELETE /orders/:id/items/:itemId
router.openapi(
  createRoute({
    method: "delete", path: "/orders/{id}/items/{itemId}",
    tags: ["Orders"],
    summary: "Remove a cart item (blocked if item is Preparing or Completed in KDS)",
    request: { params: z.object({ id: z.string().uuid(), itemId: z.string().uuid() }) },
    responses: {
      200: { description: "Updated order", content: { "application/json": { schema: z.object({ success: z.literal(true), data: OrderResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Locked by KDS", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const orderId = await resolveOrderId(c.req.param("id"));
    if (!orderId) return notFound(c, "Order not found") as any;
    const item = await db.query.orderItems.findFirst({ where: eq(orderItems.publicId, c.req.param("itemId")), columns: { id: true } });
    if (!item) return notFound(c, "Order item not found") as any;
    const result = await svc.removeCartItem(orderId, item.id);
    if ("error" in result) return mapError(c, result.error) as any;
    return ok(c, result.order);
  },
);

// POST /orders/:id/coupon
router.openapi(
  createRoute({
    method: "post", path: "/orders/{id}/coupon",
    tags: ["Orders"],
    summary: "Apply a coupon code to an order",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { "application/json": { schema: z.object({ code: z.string().min(1).max(50).openapi({ example: "SAVE20" }) }) } }, required: true },
    },
    responses: {
      200: { description: "Coupon applied", content: { "application/json": { schema: z.object({ success: z.literal(true), data: OrderResponse }) } } },
      422: { description: "Coupon invalid or not eligible", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Order not in DRAFT state", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const orderId = await resolveOrderId(c.req.param("id"));
    if (!orderId) return notFound(c, "Order not found") as any;
    const { code } = c.req.valid("json");
    const result = await svc.applyCoupon(orderId, code);
    if ("error" in result) return mapError(c, result.error) as any;
    const r = result as any;
    if (r.valid === false) return err(c, 422, r.reason ?? "COUPON_ERROR", `Coupon error: ${r.reason}`) as any;
    return ok(c, r.order);
  },
);

// POST /orders/:id/send-to-kitchen
router.openapi(
  createRoute({
    method: "post", path: "/orders/{id}/send-to-kitchen",
    tags: ["Orders"],
    summary: "Send unsent items to the Kitchen Display (incremental — won't duplicate already-sent items)",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Ticket created", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.any() }) } } },
      400: { description: "No unsent items", content: { "application/json": { schema: ErrorResponse } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const orderId = await resolveOrderId(c.req.param("id"));
    if (!orderId) return notFound(c, "Order not found") as any;
    const result = await svc.sendToKitchen(orderId);
    if ("error" in result) return mapError(c, result.error) as any;
    return ok(c, (result as any).ticket);
  },
);

// DELETE /orders/:id — hard delete DRAFT orders only
router.openapi(
  createRoute({
    method: "delete", path: "/orders/{id}",
    tags: ["Orders"],
    summary: "Hard-delete a DRAFT order and its line items. Non-draft orders return 409.",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      204: { description: "Deleted" },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Order is not in DRAFT state", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const orderId = await resolveOrderId(c.req.param("id"));
    if (!orderId) return notFound(c, "Order not found") as any;
    const result = await svc.deleteDraftOrder(orderId);
    if ("error" in result) return mapError(c, result.error) as any;
    return new Response(null, { status: 204 });
  },
);

// POST /orders/:id/cancel
router.openapi(
  createRoute({
    method: "post", path: "/orders/{id}/cancel",
    tags: ["Orders"],
    summary: "Cancel a DRAFT order",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { "application/json": { schema: z.object({ reason: z.string().max(500).optional() }) } }, required: false },
    },
    responses: {
      200: { description: "Cancelled", content: { "application/json": { schema: z.object({ success: z.literal(true), data: OrderResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Order already paid or cancelled", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const orderId = await resolveOrderId(c.req.param("id"));
    if (!orderId) return notFound(c, "Order not found") as any;
    const body = await c.req.json().catch(() => ({}));
    const result = await svc.cancelOrder(orderId, (body as any).reason);
    if ("error" in result) return mapError(c, result.error) as any;
    return ok(c, result.order);
  },
);

// POST /orders/:id/attach-customer
router.openapi(
  createRoute({
    method: "post", path: "/orders/{id}/attach-customer",
    tags: ["Orders"],
    summary: "Attach or detach a customer from a DRAFT order",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { "application/json": { schema: z.object({ customerPublicId: z.string().uuid().nullable().openapi({ description: "Pass null to detach" }) }) } }, required: true },
    },
    responses: {
      200: { description: "Updated order", content: { "application/json": { schema: z.object({ success: z.literal(true), data: OrderResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const { customerPublicId } = c.req.valid("json");
    const orderId = await resolveOrderId(c.req.param("id"));
    if (!orderId) return notFound(c, "Order not found") as any;
    let customerId: bigint | null = null;
    if (customerPublicId) {
      const cust = await db.query.customers.findFirst({ where: eq(customers.publicId, customerPublicId), columns: { id: true } });
      if (!cust) return notFound(c, "Customer not found") as any;
      customerId = cust.id;
    }
    const result = await svc.attachCustomer(orderId, customerId);
    if ("error" in result) return mapError(c, result.error) as any;
    return ok(c, result.order);
  },
);

// POST /orders/:id/payments
router.openapi(
  createRoute({
    method: "post", path: "/orders/{id}/payments",
    tags: ["Orders", "Payments"],
    summary: "Record payment and mark an order as Paid",
    description: "Contains row-level lock + re-verify guard. Replaces /mark-paid.",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { "application/json": { schema: z.object({ methodId: z.string().uuid(), amount: z.number().positive(), transactionRef: z.string().optional() }) } }, required: true },
    },
    responses: {
      200: { description: "Paid", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.object({ paid: z.boolean() }) }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Already paid or cancelled", content: { "application/json": { schema: ErrorResponse } } },
      400: { description: "Insufficient payment", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const orderId = await resolveOrderId(c.req.param("id"));
    if (!orderId) return notFound(c, "Order not found") as any;
    
    const body = c.req.valid("json");
    
    const { paymentMethods } = await import("../db/schema/03_payment_methods.ts");
    const method = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.publicId, body.methodId),
      columns: { id: true },
    });
    if (!method) return notFound(c, "Payment method not found") as any;

    const result = await svc.markOrderPaid(orderId, {
      methodId: method.id,
      amount: body.amount,
      transactionRef: body.transactionRef,
    });

    if ("error" in result) return mapError(c, result.error) as any;
    return ok(c, { paid: true });
  },
);

// GET /orders/:id/receipt
router.openapi(
  createRoute({
    method: "get", path: "/orders/{id}/receipt",
    tags: ["Orders", "Receipts"],
    summary: "Generate and fetch the structured JSON receipt for a paid order",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Receipt payload", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.any() }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Order not paid yet", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const orderId = await resolveOrderId(c.req.param("id"));
    if (!orderId) return notFound(c, "Order not found") as any;

    const result = await receiptSvc.generateReceipt(orderId);
    if ("error" in result) return mapError(c, result.error) as any;
    
    return ok(c, { receiptNumber: result.receiptNumber, payload: result.payload });
  },
);

// POST /orders/:id/receipt/email
router.openapi(
  createRoute({
    method: "post", path: "/orders/{id}/receipt/email",
    tags: ["Orders", "Receipts"],
    summary: "Email the receipt to a customer",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { "application/json": { schema: z.object({ email: z.string().email() }) } }, required: true },
    },
    responses: {
      200: { description: "Email sent", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.any() }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Order not paid yet", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const orderId = await resolveOrderId(c.req.param("id"));
    if (!orderId) return notFound(c, "Order not found") as any;

    const { email } = c.req.valid("json");
    
    // Add a basic rate limit stub if desired, but for now just call the service
    const result = await receiptSvc.sendReceiptEmail(orderId, email);
    if ("error" in result) return mapError(c, result.error) as any;
    
    return ok(c, { message: "Receipt emailed successfully" });
  },
);

export { router as ordersRouter };
