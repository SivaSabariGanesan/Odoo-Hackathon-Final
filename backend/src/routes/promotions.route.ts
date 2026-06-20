import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";
import { db } from "../db/index.ts";
import { promotions } from "../db/schema/index.ts";
import { eq, isNull, ilike, or } from "drizzle-orm";
import { ok, created, notFound } from "../utils/response.ts";
import { sql } from "drizzle-orm";

const T = ["Promotions"];

const PromoBody = z.object({
  name:           z.string().min(1).max(150),
  type:           z.enum(["COUPON_PERCENTAGE", "COUPON_FIXED", "AUTO_PRODUCT_QTY", "AUTO_ORDER_AMOUNT"]),
  discountValue:  z.number().min(0),
  couponCode:     z.string().max(50).optional().nullable(),
  minOrderAmount: z.number().min(0).optional().nullable(),
  minQty:         z.number().int().min(1).optional().nullable(),
  maxUses:        z.number().int().min(1).optional().nullable(),
  expiresAt:      z.string().optional().nullable(),   // ISO date string
  isActive:       z.boolean().optional(),
});

const PromoResponse = z.object({
  publicId:       z.string().uuid(),
  name:           z.string(),
  type:           z.string(),
  discountValue:  z.string(),
  couponCode:     z.string().nullable(),
  minOrderAmount: z.string().nullable(),
  minQty:         z.number().nullable(),
  maxUses:        z.number().nullable(),
  usedCount:      z.number(),
  isActive:       z.boolean(),
  expiresAt:      z.string().nullable(),
}).passthrough();

const ErrorResponse = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string() }),
});

const router = createRouter();

// ── GET /promotions ───────────────────────────────────────────────────────────
router.openapi(
  createRoute({
    method: "get", path: "/promotions",
    tags: T, summary: "List all promotions",
    request: {
      query: z.object({ search: z.string().optional() }),
    },
    responses: {
      200: { description: "Promotions", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.array(PromoResponse) }) } } },
    },
  }),
  async (c) => {
    const { search } = c.req.valid("query");
    let rows = await db.query.promotions.findMany({
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.couponCode ?? "").toLowerCase().includes(q)
      );
    }
    return ok(c, rows.map(toPublic));
  },
);

// ── GET /promotions/:id ───────────────────────────────────────────────────────
router.openapi(
  createRoute({
    method: "get", path: "/promotions/{id}",
    tags: T, summary: "Get promotion by public ID",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Promotion", content: { "application/json": { schema: z.object({ success: z.literal(true), data: PromoResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const row = await db.query.promotions.findFirst({ where: eq(promotions.publicId, c.req.param("id")) });
    if (!row) return notFound(c, "Promotion not found") as any;
    return ok(c, toPublic(row));
  },
);

// ── POST /promotions ──────────────────────────────────────────────────────────
router.openapi(
  createRoute({
    method: "post", path: "/promotions",
    tags: T, summary: "Create a promotion",
    request: { body: { content: { "application/json": { schema: PromoBody } }, required: true } },
    responses: {
      201: { description: "Created", content: { "application/json": { schema: z.object({ success: z.literal(true), data: PromoResponse }) } } },
    },
  }),
  async (c) => {
    const input = c.req.valid("json");
    const [row] = await db.insert(promotions).values({
      name:           input.name,
      type:           input.type as any,
      status:         (input.isActive ?? true) ? "ACTIVE" : "INACTIVE",
      discountValue:  String(input.discountValue),
      couponCode:     input.couponCode?.toUpperCase() ?? null,
      minOrderAmount: input.minOrderAmount != null ? String(input.minOrderAmount) : null,
      triggerQty:     input.minQty ?? null,
      maxUses:        input.maxUses ?? null,
      expiresAt:      input.expiresAt ? new Date(input.expiresAt) : null,
    }).returning();
    return created(c, toPublic(row!));
  },
);

// ── PATCH /promotions/:id ─────────────────────────────────────────────────────
router.openapi(
  createRoute({
    method: "patch", path: "/promotions/{id}",
    tags: T, summary: "Update a promotion",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { "application/json": { schema: PromoBody.partial() } }, required: true },
    },
    responses: {
      200: { description: "Updated", content: { "application/json": { schema: z.object({ success: z.literal(true), data: PromoResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const input = c.req.valid("json");
    const existing = await db.query.promotions.findFirst({ where: eq(promotions.publicId, c.req.param("id")) });
    if (!existing) return notFound(c, "Promotion not found") as any;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (input.name           !== undefined) updates.name           = input.name;
    if (input.type           !== undefined) updates.type           = input.type;
    if (input.discountValue  !== undefined) updates.discountValue  = String(input.discountValue);
    if (input.couponCode     !== undefined) updates.couponCode     = input.couponCode?.toUpperCase() ?? null;
    if (input.minOrderAmount !== undefined) updates.minOrderAmount = input.minOrderAmount != null ? String(input.minOrderAmount) : null;
    if (input.minQty         !== undefined) updates.triggerQty     = input.minQty ?? null;
    if (input.maxUses        !== undefined) updates.maxUses        = input.maxUses ?? null;
    if (input.expiresAt      !== undefined) updates.expiresAt      = input.expiresAt ? new Date(input.expiresAt) : null;
    if (input.isActive       !== undefined) updates.status         = input.isActive ? "ACTIVE" : "INACTIVE";

    const [row] = await db.update(promotions).set(updates).where(eq(promotions.publicId, c.req.param("id"))).returning();
    return ok(c, toPublic(row!));
  },
);

// ── DELETE /promotions/:id ────────────────────────────────────────────────────
router.openapi(
  createRoute({
    method: "delete", path: "/promotions/{id}",
    tags: T, summary: "Delete a promotion",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Deleted", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.object({ deleted: z.boolean() }) }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const existing = await db.query.promotions.findFirst({ where: eq(promotions.publicId, c.req.param("id")) });
    if (!existing) return notFound(c, "Promotion not found") as any;
    await db.delete(promotions).where(eq(promotions.publicId, c.req.param("id")));
    return ok(c, { deleted: true });
  },
);

// ── Helper ────────────────────────────────────────────────────────────────────
function toPublic(p: any) {
  return {
    publicId:       p.publicId,
    name:           p.name,
    type:           p.type,
    discountValue:  p.discountValue,
    couponCode:     p.couponCode ?? null,
    minOrderAmount: p.minOrderAmount ?? null,
    minQty:         p.triggerQty ?? null,
    maxUses:        p.maxUses ?? null,
    usedCount:      p.usedCount ?? 0,
    isActive:       p.status === "ACTIVE",
    expiresAt:      p.expiresAt ? p.expiresAt.toISOString() : null,
  };
}

export { router as promotionsRouter };
