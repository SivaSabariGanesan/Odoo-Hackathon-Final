import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";
import * as svc from "../services/category.service.ts";
import { ok, created, notFound, conflict } from "../utils/response.ts";

// ─── Shared schemas ───────────────────────────────────────────────────────────

const CategoryBody = z.object({
  name: z.string().min(1).max(100).openapi({ example: "Beverages" }),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().openapi({ example: "#6366f1" }),
  sortOrder: z.number().int().min(0).optional().openapi({ example: 0 }),
  isActive: z.boolean().optional().openapi({ example: true }),
});

const CategoryResponse = z.object({
  id: z.any(),
  publicId: z.string().uuid(),
  name: z.string(),
  color: z.string(),
  sortOrder: z.number(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ErrorResponse = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string() }),
});

const router = createRouter();

// GET /categories
router.openapi(
  createRoute({
    method: "get", path: "/categories",
    tags: ["Products"],
    summary: "List all active categories",
    responses: {
      200: { description: "List of categories", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.array(CategoryResponse) }) } } },
    },
  }),
  async (c) => {
    const data = await svc.listCategories();
    return ok(c, data);
  },
);

// GET /categories/:id
router.openapi(
  createRoute({
    method: "get", path: "/categories/{id}",
    tags: ["Products"],
    summary: "Get a category by public ID",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Category found", content: { "application/json": { schema: z.object({ success: z.literal(true), data: CategoryResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const cat = await svc.getCategoryById(c.req.param("id"));
    if (!cat) return notFound(c, "Category not found") as any;
    return ok(c, cat);
  },
);

// POST /categories
router.openapi(
  createRoute({
    method: "post", path: "/categories",
    tags: ["Products"],
    summary: "Create a category",
    request: { body: { content: { "application/json": { schema: CategoryBody.omit({ isActive: true }) } }, required: true } },
    responses: {
      201: { description: "Created", content: { "application/json": { schema: z.object({ success: z.literal(true), data: CategoryResponse }) } } },
    },
  }),
  async (c) => {
    const input = c.req.valid("json");
    const cat = await svc.createCategory(input);
    return created(c, cat as any);
  },
);

// PATCH /categories/:id
router.openapi(
  createRoute({
    method: "patch", path: "/categories/{id}",
    tags: ["Products"],
    summary: "Update a category",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { "application/json": { schema: CategoryBody.partial() } }, required: true },
    },
    responses: {
      200: { description: "Updated", content: { "application/json": { schema: z.object({ success: z.literal(true), data: CategoryResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const input = c.req.valid("json");
    const cat = await svc.updateCategory(c.req.param("id"), input);
    if (!cat) return notFound(c, "Category not found") as any;
    return ok(c, cat);
  },
);

// DELETE /categories/:id
router.openapi(
  createRoute({
    method: "delete", path: "/categories/{id}",
    tags: ["Products"],
    summary: "Delete a category (blocked if it has active products)",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Deleted", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.object({ deleted: z.boolean() }) }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Has active products", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const result = await svc.deleteCategory(c.req.param("id"));
    if (!result.found) return notFound(c, "Category not found") as any;
    if (result.blocked) return conflict(c, "CATEGORY_IN_USE", result.reason!) as any;
    return ok(c, { deleted: true });
  },
);

export { router as categoriesRouter };
