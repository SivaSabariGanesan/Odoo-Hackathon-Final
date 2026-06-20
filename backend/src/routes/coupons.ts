import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";
import { db } from "../db/index.ts";
import { orders } from "../db/schema/index.ts";
import { eq } from "drizzle-orm";
import { validateCoupon, getEligiblePromotions } from "../services/promotion.service.ts";
import { ok, notFound, err } from "../utils/response.ts";

const ErrorResponse = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string() }),
});

const PromotionResult = z.object({
  id: z.any(),
  publicId: z.string().uuid(),
  name: z.string(),
  type: z.string(),
  discountValue: z.string(),
  calculatedDiscount: z.number(),
});

const router = createRouter();

// POST /coupons/validate
router.openapi(
  createRoute({
    method: "post",
    path: "/coupons/validate",
    tags: ["Promotions"],
    summary: "Validate a coupon code without applying it",
    description: "Used for live validation as the cashier types. No side effects — does not increment usedCount.",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              code: z.string().min(1).max(50).openapi({ example: "SAVE20" }),
              orderId: z.string().uuid().openapi({ description: "Public ID of the order to check eligibility against" }),
            }),
          },
        },
        required: true,
      },
    },
    responses: {
      200: {
        description: "Coupon is valid and eligible",
        content: { "application/json": { schema: z.object({ success: z.literal(true), data: PromotionResult }) } },
      },
      404: { description: "Order not found", content: { "application/json": { schema: ErrorResponse } } },
      422: {
        description: "Coupon invalid — reason in error.code (COUPON_NOT_FOUND, COUPON_INACTIVE, COUPON_EXPIRED, COUPON_MAX_USES_REACHED, COUPON_NOT_ELIGIBLE)",
        content: { "application/json": { schema: ErrorResponse } },
      },
    },
  }),
  async (c) => {
    const { code, orderId } = c.req.valid("json");
    const order = await db.query.orders.findFirst({
      where: eq(orders.publicId, orderId),
      columns: { id: true },
    });
    if (!order) return notFound(c, "Order not found") as any;

    const result = await validateCoupon(code, order.id);
    if (!result.valid) {
      return err(c, 422, result.reason, `Coupon validation failed: ${result.reason}`) as any;
    }
    return ok(c, result.promotion);
  },
);

// GET /coupons/eligible/:orderId
router.openapi(
  createRoute({
    method: "get",
    path: "/coupons/eligible/{orderId}",
    tags: ["Promotions"],
    summary: "List all automated promotions currently eligible for an order",
    description: "Returns AUTO_PRODUCT_QTY and AUTO_ORDER_AMOUNT promotions that qualify. Useful if a selector UI is ever added.",
    request: { params: z.object({ orderId: z.string().uuid() }) },
    responses: {
      200: {
        description: "Eligible promotions",
        content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.array(PromotionResult) }) } },
      },
      404: { description: "Order not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const order = await db.query.orders.findFirst({
      where: eq(orders.publicId, c.req.param("orderId")),
      columns: { id: true },
    });
    if (!order) return notFound(c, "Order not found") as any;

    const eligible = await getEligiblePromotions(order.id);
    return ok(c, eligible);
  },
);

export { router as couponsRouter };
