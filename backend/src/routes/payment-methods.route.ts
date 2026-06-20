import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { authorize } from "../middleware/authorize.ts";
import * as pmService from "../services/payment-methods.service.ts";
import {
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
  updateCashfreeConfigSchema,
} from "../validators/payment-methods.validator.ts";
import { ok, created, err } from "../utils/response.ts";

const router = createRouter();
const T = ["Payment Methods"];

// All routes: Admin only
router.use("/api/v1/payment-methods",          authenticate, authorize(["ADMIN"]));
router.use("/api/v1/payment-methods/*",        authenticate, authorize(["ADMIN"]));
router.use("/api/v1/payment-providers/*",      authenticate, authorize(["ADMIN"]));

const idParam = z.object({ id: z.string().uuid() });

// ─── GET /api/v1/payment-methods ─────────────────────────────────────────────
router.openapi(
  createRoute({
    method: "get", path: "/api/v1/payment-methods", tags: T,
    summary: "List payment methods — filter by type / status",
    request: {
      query: z.object({
        type:      z.enum(["CASH", "CARD", "CASHFREE"]).optional(),
        isEnabled: z.enum(["true", "false"]).optional(),
        search:    z.string().optional(),
      }),
    },
    responses: { 200: { description: "Payment methods list" } },
  }),
  async (c) => {
    const { type, isEnabled, search } = c.req.valid("query");
    const methods = await pmService.listPaymentMethods({
      type,
      isEnabled: isEnabled === undefined ? undefined : isEnabled === "true",
      search,
    });
    return ok(c, methods);
  },
);

// ─── POST /api/v1/payment-methods ────────────────────────────────────────────
router.openapi(
  createRoute({
    method: "post", path: "/api/v1/payment-methods", tags: T,
    summary: "Create a payment method",
    request: { body: { content: { "application/json": { schema: createPaymentMethodSchema } } } },
    responses: {
      201: { description: "Created" },
      409: { description: "Name already exists" },
    },
  }),
  async (c) => {
    try {
      const input = createPaymentMethodSchema.parse(await c.req.json());
      const user  = c.get("user");
      const row   = await pmService.createPaymentMethod(input, user.id);
      return created(c, row);
    } catch (e: any) {
      const status = e.status ?? 400;
      return err(c, status, status === 409 ? "DUPLICATE_NAME" : "BAD_REQUEST", e.message);
    }
  },
);

// ─── GET /api/v1/payment-methods/:id ─────────────────────────────────────────
router.openapi(
  createRoute({
    method: "get", path: "/api/v1/payment-methods/{id}", tags: T,
    summary: "Get payment method by ID",
    request: { params: idParam },
    responses: { 200: { description: "Payment method" }, 404: { description: "Not found" } },
  }),
  async (c) => {
    const row = await pmService.getPaymentMethod(c.req.param("id"));
    if (!row) return err(c, 404, "NOT_FOUND", "Payment method not found");
    return ok(c, row);
  },
);

// ─── PATCH /api/v1/payment-methods/:id ───────────────────────────────────────
router.openapi(
  createRoute({
    method: "patch", path: "/api/v1/payment-methods/{id}", tags: T,
    summary: "Update name or status",
    request: {
      params: idParam,
      body: { content: { "application/json": { schema: updatePaymentMethodSchema } } },
    },
    responses: { 200: { description: "Updated" }, 404: { description: "Not found" } },
  }),
  async (c) => {
    try {
      const input = updatePaymentMethodSchema.parse(await c.req.json());
      const user  = c.get("user");
      const row   = await pmService.updatePaymentMethod(c.req.param("id"), input, user.id);
      return ok(c, row);
    } catch (e: any) {
      const status = e.status ?? 400;
      return err(c, status, status === 404 ? "NOT_FOUND" : status === 409 ? "DUPLICATE_NAME" : "BAD_REQUEST", e.message);
    }
  },
);

// ─── DELETE /api/v1/payment-methods/:id ──────────────────────────────────────
router.openapi(
  createRoute({
    method: "delete", path: "/api/v1/payment-methods/{id}", tags: T,
    summary: "Delete a payment method",
    request: { params: idParam },
    responses: { 200: { description: "Deleted" }, 404: { description: "Not found" }, 422: { description: "Cannot delete last enabled method" } },
  }),
  async (c) => {
    try {
      const user = c.get("user");
      await pmService.deletePaymentMethod(c.req.param("id"), user.id);
      return ok(c, { message: "Payment method deleted" });
    } catch (e: any) {
      const status = e.status ?? 400;
      return err(c, status, status === 404 ? "NOT_FOUND" : status === 422 ? "LAST_ENABLED_METHOD" : "BAD_REQUEST", e.message);
    }
  },
);

// ─── PATCH /api/v1/payment-methods/:id/enable ────────────────────────────────
router.openapi(
  createRoute({
    method: "patch", path: "/api/v1/payment-methods/{id}/enable", tags: T,
    summary: "Enable a payment method",
    request: { params: idParam },
    responses: { 200: { description: "Enabled" }, 404: { description: "Not found" } },
  }),
  async (c) => {
    try {
      const user = c.get("user");
      const row  = await pmService.enablePaymentMethod(c.req.param("id"), user.id);
      return ok(c, row);
    } catch (e: any) {
      const status = e.status ?? 400;
      return err(c, status, status === 404 ? "NOT_FOUND" : "BAD_REQUEST", e.message);
    }
  },
);

// ─── PATCH /api/v1/payment-methods/:id/disable ───────────────────────────────
router.openapi(
  createRoute({
    method: "patch", path: "/api/v1/payment-methods/{id}/disable", tags: T,
    summary: "Disable a payment method — enforces at-least-one-enabled rule",
    request: { params: idParam },
    responses: {
      200: { description: "Disabled" },
      404: { description: "Not found" },
      422: { description: "Last enabled method — cannot disable" },
    },
  }),
  async (c) => {
    try {
      const user = c.get("user");
      const row  = await pmService.disablePaymentMethod(c.req.param("id"), user.id);
      return ok(c, row);
    } catch (e: any) {
      const status = e.status ?? 400;
      return err(c, status, status === 404 ? "NOT_FOUND" : status === 422 ? "LAST_ENABLED_METHOD" : "BAD_REQUEST", e.message);
    }
  },
);

// ─── GET /api/v1/payment-providers/cashfree ──────────────────────────────────
router.openapi(
  createRoute({
    method: "get", path: "/api/v1/payment-providers/cashfree", tags: T,
    summary: "Get Cashfree config metadata — secrets never returned",
    responses: { 200: { description: "Cashfree config" } },
  }),
  async (c) => {
    const config = await pmService.getCashfreeConfig();
    if (!config) return ok(c, null);
    return ok(c, config);
  },
);

// ─── PATCH /api/v1/payment-providers/cashfree ────────────────────────────────
router.openapi(
  createRoute({
    method: "patch", path: "/api/v1/payment-providers/cashfree", tags: T,
    summary: "Create or update Cashfree config — secrets encrypted at rest",
    request: {
      body: { content: { "application/json": { schema: updateCashfreeConfigSchema } } },
    },
    responses: { 200: { description: "Cashfree config updated" } },
  }),
  async (c) => {
    try {
      const input = updateCashfreeConfigSchema.parse(await c.req.json());
      const user  = c.get("user");
      const config = await pmService.updateCashfreeConfig(input, user.id);
      return ok(c, config);
    } catch (e: any) {
      return err(c, e.status ?? 400, "BAD_REQUEST", e.message);
    }
  },
);

export { router as paymentMethodsRouter };
