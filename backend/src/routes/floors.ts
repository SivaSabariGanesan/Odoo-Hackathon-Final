import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";
import * as floorSvc from "../services/floor.service.ts";
import { ok, created, notFound, conflict } from "../utils/response.ts";

const ErrorResponse = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string() }),
});

const FloorBody = z.object({
  name: z.string().min(1).max(100).openapi({ example: "Ground Floor" }),
  sortOrder: z.number().int().min(0).optional(),
});

const TableBody = z.object({
  floorId: z.string().uuid().openapi({ description: "Public ID of the parent floor" }),
  tableNumber: z.string().min(1).max(20).openapi({ example: "T-01" }),
  seats: z.number().int().min(1).optional().openapi({ example: 4 }),
  posX: z.number().int().optional(),
  posY: z.number().int().optional(),
});

const FloorResponse = z.object({ id: z.any(), publicId: z.string().uuid(), name: z.string(), sortOrder: z.number(), isActive: z.boolean() }).passthrough();
const TableResponse = z.object({ id: z.any(), publicId: z.string().uuid(), tableNumber: z.string(), seats: z.number(), isActive: z.boolean(), isOccupied: z.boolean().optional() }).passthrough();

const router = createRouter();

// GET /floors
router.openapi(
  createRoute({
    method: "get", path: "/floors",
    tags: ["Floors & Tables"],
    summary: "List all active floors with nested tables",
    responses: { 200: { description: "Floors", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.array(FloorResponse) }) } } } },
  }),
  async (c) => ok(c, await floorSvc.listFloors()),
);

// GET /floors/:id
router.openapi(
  createRoute({
    method: "get", path: "/floors/{id}",
    tags: ["Floors & Tables"],
    summary: "Get a floor by public ID",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Floor", content: { "application/json": { schema: z.object({ success: z.literal(true), data: FloorResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const floor = await floorSvc.getFloorById(c.req.param("id"));
    if (!floor) return notFound(c, "Floor not found") as any;
    return ok(c, floor);
  },
);

// POST /floors
router.openapi(
  createRoute({
    method: "post", path: "/floors",
    tags: ["Floors & Tables"],
    summary: "Create a floor",
    request: { body: { content: { "application/json": { schema: FloorBody } }, required: true } },
    responses: { 201: { description: "Created", content: { "application/json": { schema: z.object({ success: z.literal(true), data: FloorResponse }) } } } },
  }),
  async (c) => created(c, await floorSvc.createFloor(c.req.valid("json"))),
);

// PATCH /floors/:id
router.openapi(
  createRoute({
    method: "patch", path: "/floors/{id}",
    tags: ["Floors & Tables"],
    summary: "Update a floor",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { "application/json": { schema: FloorBody.partial() } }, required: true },
    },
    responses: {
      200: { description: "Updated", content: { "application/json": { schema: z.object({ success: z.literal(true), data: FloorResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const floor = await floorSvc.updateFloor(c.req.param("id"), c.req.valid("json"));
    if (!floor) return notFound(c, "Floor not found") as any;
    return ok(c, floor);
  },
);

// DELETE /floors/:id
router.openapi(
  createRoute({
    method: "delete", path: "/floors/{id}",
    tags: ["Floors & Tables"],
    summary: "Delete a floor (blocked if it has active tables)",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Deleted", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.object({ deleted: z.boolean() }) }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Has active tables", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const result = await floorSvc.deleteFloor(c.req.param("id"));
    if (!result.found) return notFound(c, "Floor not found") as any;
    if (result.blocked) return conflict(c, "FLOOR_HAS_TABLES", result.reason!) as any;
    return ok(c, { deleted: true });
  },
);

// GET /floors/:floorId/tables
router.openapi(
  createRoute({
    method: "get", path: "/floors/{floorId}/tables",
    tags: ["Floors & Tables"],
    summary: "List tables for a floor (with derived isOccupied status)",
    request: { params: z.object({ floorId: z.string().uuid() }) },
    responses: {
      200: { description: "Tables", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.array(TableResponse) }) } } },
      404: { description: "Floor not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const tables = await floorSvc.listTablesForFloor(c.req.param("floorId"));
    if (!tables) return notFound(c, "Floor not found") as any;
    return ok(c, tables);
  },
);

// GET /floors/tables/:id
router.openapi(
  createRoute({
    method: "get", path: "/floors/tables/{id}",
    tags: ["Floors & Tables"],
    summary: "Get a table by public ID",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Table", content: { "application/json": { schema: z.object({ success: z.literal(true), data: TableResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const table = await floorSvc.getTableById(c.req.param("id"));
    if (!table) return notFound(c, "Table not found") as any;
    return ok(c, table);
  },
);

// POST /floors/tables
router.openapi(
  createRoute({
    method: "post", path: "/floors/tables",
    tags: ["Floors & Tables"],
    summary: "Create a table",
    request: { body: { content: { "application/json": { schema: TableBody } }, required: true } },
    responses: {
      201: { description: "Created", content: { "application/json": { schema: z.object({ success: z.literal(true), data: TableResponse }) } } },
      404: { description: "Floor not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const result = await floorSvc.createTable(c.req.valid("json"));
    if ("error" in result) return notFound(c, "Floor not found") as any;
    return created(c, result.table);
  },
);

// PATCH /floors/tables/:id
router.openapi(
  createRoute({
    method: "patch", path: "/floors/tables/{id}",
    tags: ["Floors & Tables"],
    summary: "Update a table",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { "application/json": { schema: TableBody.partial().omit({ floorId: true }) } }, required: true },
    },
    responses: {
      200: { description: "Updated", content: { "application/json": { schema: z.object({ success: z.literal(true), data: TableResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const result = await floorSvc.updateTable(c.req.param("id"), c.req.valid("json"));
    if (!result.found) return notFound(c, "Table not found") as any;
    return ok(c, result.table);
  },
);

// POST /floors/tables/:id/toggle-active
router.openapi(
  createRoute({
    method: "post", path: "/floors/tables/{id}/toggle-active",
    tags: ["Floors & Tables"],
    summary: "Toggle a table's active/inactive status",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Toggled", content: { "application/json": { schema: z.object({ success: z.literal(true), data: TableResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const result = await floorSvc.toggleTableActive(c.req.param("id"));
    if (!result.found) return notFound(c, "Table not found") as any;
    return ok(c, result.table);
  },
);

// DELETE /floors/tables/:id
router.openapi(
  createRoute({
    method: "delete", path: "/floors/tables/{id}",
    tags: ["Floors & Tables"],
    summary: "Soft-delete a table (blocked if table has an open order)",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Deleted", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.object({ deleted: z.boolean() }) }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Table occupied", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const result = await floorSvc.deleteTable(c.req.param("id"));
    if (!result.found) return notFound(c, "Table not found") as any;
    if (result.blocked) return conflict(c, "TABLE_OCCUPIED", result.reason!) as any;
    return ok(c, { deleted: true });
  },
);

// GET /floors/tables/resolve/:token
router.openapi(
  createRoute({
    method: "get", path: "/floors/tables/resolve/{token}",
    tags: ["Floors & Tables"],
    summary: "Resolve a QR token to a table (used by self-ordering flow)",
    security: [],
    request: { params: z.object({ token: z.string().uuid() }) },
    responses: {
      200: { description: "Table", content: { "application/json": { schema: z.object({ success: z.literal(true), data: TableResponse }) } } },
      404: { description: "Token not found or inactive", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const table = await floorSvc.resolveTableByToken(c.req.param("token"));
    if (!table) return notFound(c, "Table not found or inactive") as any;
    return ok(c, table);
  },
);

export { router as floorsRouter };
