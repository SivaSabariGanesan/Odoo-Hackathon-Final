import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";
import { verifyCustomerToken } from "../services/customer-auth.service.ts";
import * as svc from "../services/customer-auth.service.ts";
import { ok, created, err, notFound } from "../utils/response.ts";

const T = ["Customer Auth"];

// ─── Shared schemas ───────────────────────────────────────────────────────────

const RegisterBody = z.object({
  name:     z.string().min(1).max(100).openapi({ example: "Ravi Kumar" }),
  email:    z.string().email().openapi({ example: "ravi@example.com" }),
  password: z.string().min(8, "Min 8 characters").openapi({ example: "Secret@123" }),
  phone:    z.string().min(7).max(20).optional().openapi({ example: "+919876543210" }),
});

const LoginBody = z.object({
  email:    z.string().email().openapi({ example: "ravi@example.com" }),
  password: z.string().min(1).openapi({ example: "Secret@123" }),
});

const CustomerResponse = z.object({
  customer:    z.object({ id: z.string(), name: z.string(), email: z.string().nullable(), phone: z.string().nullable() }),
  accessToken: z.string(),
});

const ErrorResponse = z.object({
  success: z.literal(false),
  error:   z.object({ code: z.string(), message: z.string() }),
});

// ─── Customer auth middleware (inline for this router) ────────────────────────

async function requireCustomer(c: any): Promise<{ sub: string; email: string } | null> {
  const header = c.req.header("Authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  return verifyCustomerToken(header.slice(7));
}

const router = createRouter();

// ─── POST /api/v1/customer/auth/register ─────────────────────────────────────
router.openapi(
  createRoute({
    method: "post", path: "/customer/auth/register",
    tags: T, security: [],
    summary: "Customer self-registration — creates account & returns JWT",
    request: { body: { content: { "application/json": { schema: RegisterBody } }, required: true } },
    responses: {
      201: { description: "Registered", content: { "application/json": { schema: z.object({ success: z.literal(true), data: CustomerResponse }) } } },
      409: { description: "Email already registered", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    try {
      const input = RegisterBody.parse(await c.req.json());
      const result = await svc.customerRegister(input);
      return created(c, result);
    } catch (e: any) {
      const status = e.status ?? 400;
      return err(c, status, status === 409 ? "EMAIL_ALREADY_REGISTERED" : "BAD_REQUEST", e.message) as any;
    }
  },
);

// ─── POST /api/v1/customer/auth/login ────────────────────────────────────────
router.openapi(
  createRoute({
    method: "post", path: "/customer/auth/login",
    tags: T, security: [],
    summary: "Customer login — returns JWT",
    request: { body: { content: { "application/json": { schema: LoginBody } }, required: true } },
    responses: {
      200: { description: "Logged in", content: { "application/json": { schema: z.object({ success: z.literal(true), data: CustomerResponse }) } } },
      401: { description: "Invalid credentials", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    try {
      const input = LoginBody.parse(await c.req.json());
      const result = await svc.customerLogin(input);
      return ok(c, result);
    } catch (e: any) {
      const status = e.status ?? 400;
      return err(c, status, status === 401 ? "UNAUTHORIZED" : "BAD_REQUEST", e.message) as any;
    }
  },
);

// ─── GET /api/v1/customer/auth/me ────────────────────────────────────────────
router.openapi(
  createRoute({
    method: "get", path: "/customer/auth/me",
    tags: T,
    summary: "Logged-in customer profile + recent orders",
    responses: {
      200: { description: "Profile", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.any() }) } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const payload = await requireCustomer(c);
    if (!payload) return err(c, 401, "UNAUTHORIZED", "Authentication required") as any;
    try {
      const result = await svc.getCustomerProfile(payload.sub);
      return ok(c, result);
    } catch (e: any) {
      return notFound(c, e.message) as any;
    }
  },
);

// ─── POST /api/customer/orders/:orderPublicId/receipt ─────────────────────────
router.openapi(
  createRoute({
    method: "post", path: "/customer/orders/{orderId}/receipt",
    tags: T, security: [],
    summary: "Email the receipt for a paid order to the customer (or a provided email)",
    description: "If the order has a customer with an email, it uses that. Pass `email` in body to override (e.g. guest checkout).",
    request: {
      params: z.object({ orderId: z.string().uuid() }),
      body: {
        content: { "application/json": { schema: z.object({ email: z.string().email().optional() }) } },
        required: false,
      },
    },
    responses: {
      200: { description: "Receipt sent", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.object({ sent: z.boolean(), to: z.string(), receiptNumber: z.string() }) }) } } },
      404: { description: "Order not found", content: { "application/json": { schema: ErrorResponse } } },
      422: { description: "Order not paid or no email available", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    try {
      const { orderId } = c.req.param() as { orderId: string };
      const body = await c.req.json().catch(() => ({}));
      const result = await svc.sendReceiptEmail(orderId, (body as any).email);
      return ok(c, result);
    } catch (e: any) {
      const status = e.status ?? 500;
      if (status === 404) return notFound(c, e.message) as any;
      return err(c, status, status === 422 ? "UNPROCESSABLE" : "INTERNAL_ERROR", e.message) as any;
    }
  },
);

export { router as customerAuthRouter };
