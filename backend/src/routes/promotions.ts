import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { authorize } from "../middleware/authorize.ts";
import * as svc from "../services/promotion.service.ts";
import { ok, created, notFound, conflict, err } from "../utils/response.ts";

const PromotionTypeEnum = z.enum([
  "COUPON_PERCENTAGE",
  "COUPON_FIXED",
  "AUTO_PRODUCT_QTY",
  "AUTO_ORDER_AMOUNT",
]);

const PromotionStatusEnum = z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]);

const PromotionBaseBody = z.object({
  name: z.string().min(1).max(150),
  description: z.string().optional(),
  type: PromotionTypeEnum,
  status: PromotionStatusEnum.optional().default("ACTIVE"),
  couponCode: z.string().max(50).optional(),
  discountValue: z.number().positive(),
  minOrderAmount: z.number().positive().optional(),
  triggerProductId: z.string().uuid().optional(),
  triggerQty: z.number().int().positive().optional(),
  maxUses: z.number().int().positive().optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

const promotionRefinement = (data: any, ctx: z.RefinementCtx) => {
  // Coupon conditional logic
  if (data.type === "COUPON_PERCENTAGE" || data.type === "COUPON_FIXED") {
    if (!data.couponCode) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "couponCode is required for COUPON types", path: ["couponCode"] });
    }
  }
  
  if (data.type === "COUPON_PERCENTAGE" && data.discountValue > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Percentage discount cannot exceed 100", path: ["discountValue"] });
  }

  // Auto Product Qty logic
  if (data.type === "AUTO_PRODUCT_QTY") {
    if (!data.triggerProductId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "triggerProductId is required for AUTO_PRODUCT_QTY", path: ["triggerProductId"] });
    if (!data.triggerQty) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "triggerQty is required for AUTO_PRODUCT_QTY", path: ["triggerQty"] });
  }

  // Auto Order Amount logic
  if (data.type === "AUTO_ORDER_AMOUNT") {
    if (!data.minOrderAmount) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "minOrderAmount is required for AUTO_ORDER_AMOUNT", path: ["minOrderAmount"] });
    }
  }
};

const PromotionBody = PromotionBaseBody.superRefine(promotionRefinement);
const PromotionPatchBody = PromotionBaseBody.omit({ type: true }).partial();

const PromotionResponse = z.object({
  id: z.any(),
  publicId: z.string().uuid(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
  couponCode: z.string().nullable(),
  discountValue: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).passthrough();

const ErrorResponse = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string() }),
});

const router = createRouter();

// Promotions management requires ADMIN role
router.use("/promotions",    authenticate, authorize(["ADMIN"]));
router.use("/promotions/*",  authenticate, authorize(["ADMIN"]));

// GET /promotions
router.openapi(
  createRoute({
    method: "get", path: "/promotions",
    tags: ["Promotions"],
    summary: "List all promotions",
    request: {
      query: z.object({
        search: z.string().optional(),
        type: PromotionTypeEnum.optional(),
        status: PromotionStatusEnum.optional(),
        page: z.string().optional(),
        pageSize: z.string().optional(),
      }),
    },
    responses: {
      200: { description: "Promotions list", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.array(PromotionResponse) }) } } },
    },
  }),
  async (c) => {
    const { search, type, status, page, pageSize } = c.req.valid("query");
    const result = await svc.listPromotions({
      search,
      type,
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    return ok(c, result.rows);
  },
);

// GET /promotions/:id
router.openapi(
  createRoute({
    method: "get", path: "/promotions/{id}",
    tags: ["Promotions"],
    summary: "Get a promotion by public ID",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Promotion found", content: { "application/json": { schema: z.object({ success: z.literal(true), data: PromotionResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const promo = await svc.getPromotionById(c.req.param("id"));
    if (!promo) return notFound(c, "Promotion not found") as any;
    return ok(c, promo);
  },
);

// POST /promotions
router.openapi(
  createRoute({
    method: "post", path: "/promotions",
    tags: ["Promotions"],
    summary: "Create a promotion",
    request: { body: { content: { "application/json": { schema: PromotionBody } }, required: true } },
    responses: {
      201: { description: "Created", content: { "application/json": { schema: z.object({ success: z.literal(true), data: PromotionResponse }) } } },
      409: { description: "Duplicate code", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const input = c.req.valid("json");
    
    // Resolve triggerProductId if provided
    let dbProductId: bigint | null = null;
    if (input.triggerProductId) {
      const { db } = await import("../db/index.ts");
      const { products } = await import("../db/schema/index.ts");
      const { eq } = await import("drizzle-orm");
      const p = await db.query.products.findFirst({
        where: eq(products.publicId, input.triggerProductId),
        columns: { id: true }
      });
      if (!p) return notFound(c, "Trigger product not found") as any;
      dbProductId = p.id;
    }

    const payload = { ...input, triggerProductId: dbProductId };
    const result = await svc.createPromotion(payload);
    
    if (result.error === "DUPLICATE_CODE") return conflict(c, "DUPLICATE_CODE", "Coupon code already exists") as any;
    
    return created(c, result.promo as any);
  },
);

// PATCH /promotions/:id
router.openapi(
  createRoute({
    method: "patch", path: "/promotions/{id}",
    tags: ["Promotions"],
    summary: "Update a promotion (type is locked)",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { "application/json": { schema: PromotionPatchBody } }, required: true },
    },
    responses: {
      200: { description: "Updated", content: { "application/json": { schema: z.object({ success: z.literal(true), data: PromotionResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Duplicate code", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const input = c.req.valid("json");
    
    // Resolve triggerProductId if provided
    let dbProductId: bigint | null = null;
    if (input.triggerProductId) {
      const { db } = await import("../db/index.ts");
      const { products } = await import("../db/schema/index.ts");
      const { eq } = await import("drizzle-orm");
      const p = await db.query.products.findFirst({
        where: eq(products.publicId, input.triggerProductId),
        columns: { id: true }
      });
      if (!p) return notFound(c, "Trigger product not found") as any;
      dbProductId = p.id;
    }

    const payload = { ...input };
    if (input.triggerProductId) payload.triggerProductId = dbProductId as any;

    const result = await svc.updatePromotion(c.req.param("id"), payload);
    
    if (!result.found) return notFound(c, "Promotion not found") as any;
    if (result.error === "DUPLICATE_CODE") return conflict(c, "DUPLICATE_CODE", "Coupon code already exists") as any;
    
    return ok(c, result.promo);
  },
);

// DELETE /promotions/:id
router.openapi(
  createRoute({
    method: "delete", path: "/promotions/{id}",
    tags: ["Promotions"],
    summary: "Hard-delete a promotion (blocked if applied to any order)",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Deleted", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.object({ deleted: z.boolean() }) }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Referenced by orders", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const result = await svc.deletePromotion(c.req.param("id"));
    if (!result.found) return notFound(c, "Promotion not found") as any;
    if (result.blocked) return conflict(c, "PROMOTION_IN_USE", result.reason!) as any;
    return ok(c, { deleted: true });
  },
);

// PATCH /promotions/:id/toggle
router.openapi(
  createRoute({
    method: "patch", path: "/promotions/{id}/toggle",
    tags: ["Promotions"],
    summary: "Toggle active status",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Toggled", content: { "application/json": { schema: z.object({ success: z.literal(true), data: PromotionResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const result = await svc.togglePromotion(c.req.param("id"));
    if (!result.found) return notFound(c, "Promotion not found") as any;
    return ok(c, result.promo);
  },
);

export { router as promotionsRouter };
