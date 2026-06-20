import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { authorize } from "../middleware/authorize.ts";
import * as paymentsService from "../services/payments.service.ts";
import {
  createPaymentOrderSchema,
  cashPaymentSchema,
  cardPaymentSchema,
  cashfreePaymentSchema,
} from "../validators/payments.validator.ts";
import { ok, created, err } from "../utils/response.ts";

const router = createRouter();
const T = ["Payments"];
const idParam = z.object({ id: z.string().uuid() });

// Auth guard for all payment routes except the public webhook
router.use("/api/v1/orders/*",      authenticate, authorize(["ADMIN", "CASHIER"]));
router.use("/api/v1/payments/cashfree/webhook", async (_c, next) => next()); // public — skip auth

// ─── POST /api/v1/orders/:id/payment-order ────────────────────────────────────
// Step 1 of every checkout: creates a PENDING transaction for the order.
router.openapi(
  createRoute({
    method: "post", path: "/api/v1/orders/{id}/payment-order", tags: T,
    summary: "Create payment order — first step of checkout",
    request: {
      params: idParam,
      body: { content: { "application/json": { schema: createPaymentOrderSchema } } },
    },
    responses: {
      201: { description: "Payment order created" },
      404: { description: "Order or payment method not found" },
      422: { description: "Order not eligible / method disabled" },
    },
  }),
  async (c) => {
    try {
      const user  = c.get("user");
      const input = createPaymentOrderSchema.parse(await c.req.json());
      const result = await paymentsService.createPaymentOrder(
        c.req.param("id"),
        input.paymentMethodId,
        user.id,
      );
      return created(c, result);
    } catch (e: any) {
      const status = e.status ?? 400;
      return err(c, status, e.code ?? "BAD_REQUEST", e.message);
    }
  },
);

// ─── POST /api/v1/orders/:id/payments/cash ────────────────────────────────────
router.openapi(
  createRoute({
    method: "post", path: "/api/v1/orders/{id}/payments/cash", tags: T,
    summary: "Process cash payment",
    request: {
      params: idParam,
      body: { content: { "application/json": { schema: cashPaymentSchema } } },
    },
    responses: {
      200: { description: "Cash payment successful" },
      409: { description: "Order already paid" },
      422: { description: "Insufficient cash amount" },
    },
  }),
  async (c) => {
    try {
      const user  = c.get("user");
      const input = cashPaymentSchema.parse(await c.req.json());
      const result = await paymentsService.processCashPayment(
        c.req.param("id"),
        input,
        user.id,
      );
      return ok(c, result);
    } catch (e: any) {
      const status = e.status ?? 400;
      return err(c, status, e.code ?? "BAD_REQUEST", e.message);
    }
  },
);

// ─── POST /api/v1/orders/:id/payments/card ────────────────────────────────────
router.openapi(
  createRoute({
    method: "post", path: "/api/v1/orders/{id}/payments/card", tags: T,
    summary: "Process card payment",
    request: {
      params: idParam,
      body: { content: { "application/json": { schema: cardPaymentSchema } } },
    },
    responses: {
      200: { description: "Card payment successful" },
      409: { description: "Order already paid / duplicate reference" },
    },
  }),
  async (c) => {
    try {
      const user  = c.get("user");
      const input = cardPaymentSchema.parse(await c.req.json());
      const result = await paymentsService.processCardPayment(
        c.req.param("id"),
        input,
        user.id,
      );
      return ok(c, result);
    } catch (e: any) {
      const status = e.status ?? 400;
      return err(c, status, e.code ?? "BAD_REQUEST", e.message);
    }
  },
);

// ─── POST /api/v1/orders/:id/payments/cashfree ───────────────────────────────
// Creates a Cashfree order and returns payment_session_id for the frontend SDK.
router.openapi(
  createRoute({
    method: "post", path: "/api/v1/orders/{id}/payments/cashfree", tags: T,
    summary: "Initiate Cashfree payment — returns payment_session_id",
    request: {
      params: idParam,
      body: { content: { "application/json": { schema: cashfreePaymentSchema } } },
    },
    responses: {
      200: { description: "Cashfree order created" },
      422: { description: "Cashfree not configured" },
      502: { description: "Cashfree API error" },
    },
  }),
  async (c) => {
    try {
      const user  = c.get("user");
      const input = cashfreePaymentSchema.parse(await c.req.json());
      const result = await paymentsService.createCashfreeOrder(
        c.req.param("id"),
        input.transactionId,
        user.id,
      );
      return ok(c, result);
    } catch (e: any) {
      const status = e.status ?? 400;
      return err(c, status, e.code ?? "BAD_REQUEST", e.message);
    }
  },
);

// ─── POST /api/v1/payments/cashfree/webhook ───────────────────────────────────
// Public endpoint — Cashfree calls this directly (no auth token).
// Security is via HMAC-SHA256 signature verification.
router.openapi(
  createRoute({
    method: "post", path: "/api/v1/payments/cashfree/webhook", tags: T,
    summary: "Cashfree payment webhook — HMAC-SHA256 verified",
    security: [],                                                     // no Bearer auth
    responses: {
      200: { description: "Webhook processed" },
      401: { description: "Invalid signature or expired timestamp" },
    },
  }),
  async (c) => {
    try {
      const rawBody  = await c.req.text();
      const sig      = c.req.header("x-webhook-signature") ?? "";
      const ts       = c.req.header("x-webhook-timestamp") ?? "";

      if (!sig || !ts) {
        return err(c, 401, "MISSING_SIGNATURE", "Webhook signature headers required");
      }

      const result = await paymentsService.handleCashfreeWebhook(rawBody, sig, ts);
      return ok(c, result);
    } catch (e: any) {
      const status = e.status ?? 400;
      return err(c, status, e.code ?? "WEBHOOK_ERROR", e.message);
    }
  },
);

export { router as paymentsRouter };
