import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";
import * as svc from "../services/product.service.ts";
import { ok, created, notFound, conflict, err } from "../utils/response.ts";

// ─── Shared schemas ───────────────────────────────────────────────────────────

const UomEnum = z.enum(["PIECE", "CUP", "GLASS", "PLATE", "BOWL", "KG", "GRAM", "LITRE", "ML"]);
const TaxTypeEnum = z.enum(["NONE", "INCLUSIVE", "EXCLUSIVE"]);
const ALLOWED_TAX_RATES = [0, 5, 12, 18, 28] as const;

// Base shape without refinements — safe to call .partial() on
const ProductBodyShape = z.object({
  categoryId: z.string().openapi({ description: "Public UUID of an existing category. Provide this OR categoryName." }).optional(),
  categoryName: z.string().min(1).max(100).openapi({ description: "Inline category name — looked up or created. Provide this OR categoryId." }).optional(),
  categoryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).openapi({ description: "Hex color used only when creating the category inline." }).optional(),
  name: z.string().min(1).max(200).openapi({ example: "Masala Chai" }),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  price: z.number().min(0).openapi({ example: 60 }),
  uom: UomEnum.optional(),
  taxType: TaxTypeEnum.optional(),
  taxRate: z.number().refine((v) => (ALLOWED_TAX_RATES as readonly number[]).includes(v), {
    message: "Tax rate must be one of: 0, 5, 12, 18, 28",
  }).optional().openapi({ example: 5 }),
  isAvailable: z.boolean().optional(),
  sendToKitchen: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  kdsVisible: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// Create body — adds cross-field refinement requiring categoryId or categoryName
const ProductBody = ProductBodyShape.refine((d) => d.categoryId || d.categoryName, {
  message: "Either categoryId or categoryName is required",
  path: ["categoryId"],
});

// Patch body — all fields optional, no cross-field requirement
const ProductPatchBody = ProductBodyShape.partial();

const ProductResponse = z.object({
  id: z.any(),
  publicId: z.string().uuid(),
  name: z.string(),
  price: z.string(),
  isAvailable: z.boolean(),
  categoryId: z.any(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).passthrough();

const BulkBody = z.object({
  ids: z.array(z.string().uuid()).min(1).openapi({ example: ["uuid1", "uuid2"] }),
});

const ErrorResponse = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string() }),
});

const router = createRouter();

// GET /products
router.openapi(
  createRoute({
    method: "get", path: "/products",
    tags: ["Products"],
    summary: "List products",
    request: {
      query: z.object({
        search: z.string().optional(),
        categoryId: z.string().optional(),
        isAvailable: z.enum(["true", "false"]).optional(),
        kdsVisible: z.enum(["true", "false"]).optional(),
        page: z.string().optional(),
        pageSize: z.string().optional(),
      }),
    },
    responses: {
      200: { description: "Product list", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.array(ProductResponse) }) } } },
    },
  }),
  async (c) => {
    const { search, isAvailable, kdsVisible, page, pageSize } = c.req.valid("query");
    const result = await svc.listProducts({
      search,
      isAvailable: isAvailable !== undefined ? isAvailable === "true" : undefined,
      kdsVisible: kdsVisible !== undefined ? kdsVisible === "true" : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    return ok(c, result.rows);
  },
);

// GET /products/:id
router.openapi(
  createRoute({
    method: "get", path: "/products/{id}",
    tags: ["Products"],
    summary: "Get a product by public ID",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Product", content: { "application/json": { schema: z.object({ success: z.literal(true), data: ProductResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const product = await svc.getProductById(c.req.param("id"));
    if (!product) return notFound(c, "Product not found") as any;
    return ok(c, product);
  },
);

// POST /products
router.openapi(
  createRoute({
    method: "post", path: "/products",
    tags: ["Products"],
    summary: "Create a product",
    request: { body: { content: { "application/json": { schema: ProductBody } }, required: true } },
    responses: {
      201: { description: "Created", content: { "application/json": { schema: z.object({ success: z.literal(true), data: ProductResponse }) } } },
      422: { description: "Invalid tax rate", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const input = c.req.valid("json");
    const result = await svc.createProduct(input as any);
    if ("error" in result) {
      if (result.error === "INVALID_TAX_RATE")
        return err(c, 422, "INVALID_TAX_RATE", "Tax rate must be one of: 0, 5, 12, 18, 28") as any;
      if (result.error === "CATEGORY_NOT_FOUND")
        return err(c, 404, "NOT_FOUND", "Category not found") as any;
      if (result.error === "CATEGORY_REQUIRED")
        return err(c, 400, "VALIDATION_ERROR", "Either categoryId or categoryName is required") as any;
    }
    return created(c, (result as any).product);
  },
);

// PATCH /products/:id
router.openapi(
  createRoute({
    method: "patch", path: "/products/{id}",
    tags: ["Products"],
    summary: "Update a product",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { "application/json": { schema: ProductPatchBody } }, required: true },
    },
    responses: {
      200: { description: "Updated", content: { "application/json": { schema: z.object({ success: z.literal(true), data: ProductResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
      422: { description: "Invalid tax rate", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const input = c.req.valid("json");
    const result = await svc.updateProduct(c.req.param("id"), input as any);
    if (!result.found) return notFound(c, "Product not found") as any;
    if ("error" in result && result.error === "INVALID_TAX_RATE") return err(c, 422, "INVALID_TAX_RATE", "Tax rate must be one of: 0, 5, 12, 18, 28") as any;
    return ok(c, result.product);
  },
);

// DELETE /products/:id
router.openapi(
  createRoute({
    method: "delete", path: "/products/{id}",
    tags: ["Products"],
    summary: "Soft-delete a product (blocked if referenced by orders)",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Deleted", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.object({ deleted: z.boolean() }) }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Referenced by orders", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const result = await svc.deleteProduct(c.req.param("id"));
    if (!result.found) return notFound(c, "Product not found") as any;
    if (result.blocked) return conflict(c, "PRODUCT_IN_USE", result.reason!) as any;
    return ok(c, { deleted: true });
  },
);

// POST /products/:id/archive
router.openapi(
  createRoute({
    method: "post", path: "/products/{id}/archive",
    tags: ["Products"],
    summary: "Archive a product (sets isAvailable = false)",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Archived", content: { "application/json": { schema: z.object({ success: z.literal(true), data: ProductResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const result = await svc.archiveProduct(c.req.param("id"));
    if (!result.found) return notFound(c, "Product not found") as any;
    return ok(c, result.product);
  },
);

// POST /products/bulk/archive
router.openapi(
  createRoute({
    method: "post", path: "/products/bulk/archive",
    tags: ["Products"],
    summary: "Bulk archive products",
    request: { body: { content: { "application/json": { schema: BulkBody } }, required: true } },
    responses: {
      200: { description: "Result", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.object({ archived: z.number() }) }) } } },
    },
  }),
  async (c) => {
    const { ids } = c.req.valid("json");
    const result = await svc.bulkArchiveProducts(ids);
    return ok(c, result);
  },
);

// POST /products/bulk/delete
router.openapi(
  createRoute({
    method: "post", path: "/products/bulk/delete",
    tags: ["Products"],
    summary: "Bulk delete products (skips those referenced by orders)",
    request: { body: { content: { "application/json": { schema: BulkBody } }, required: true } },
    responses: {
      200: { description: "Result", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.object({ deleted: z.number(), blocked: z.array(z.string()) }) }) } } },
      409: { description: "All blocked", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const { ids } = c.req.valid("json");
    const result = await svc.bulkDeleteProducts(ids);
    if (result.blocked.length > 0 && result.deleted === 0) return conflict(c, "PRODUCT_IN_USE", "All selected products are referenced by existing orders") as any;
    return ok(c, result);
  },
);

export { router as productsRouter };
