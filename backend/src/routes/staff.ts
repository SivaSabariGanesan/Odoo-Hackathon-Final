import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";
import * as svc from "../services/staff.service.ts";
import { ok, created, notFound, conflict } from "../utils/response.ts";

const ErrorResponse = z.object({ success: z.literal(false), error: z.object({ code: z.string(), message: z.string() }) });

const StaffResponse = z.object({
  id: z.any(), publicId: z.string().uuid(), name: z.string(), email: z.string(),
  role: z.enum(["ADMIN", "CASHIER", "MANAGER"]), status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
}).passthrough();

const CreateStaffBody = z.object({
  name: z.string().min(1).max(100).openapi({ example: "Arjun Sharma" }),
  email: z.string().email().openapi({ example: "arjun@cafe.com" }),
  password: z.string().min(8).openapi({ example: "secret123" }),
  phone: z.string().min(7).max(20).optional(),
  role: z.enum(["ADMIN", "CASHIER", "MANAGER"]).optional().openapi({ example: "CASHIER" }),
  pin: z.string().length(6).regex(/^\d{6}$/).optional().openapi({ example: "123456" }),
  avatarUrl: z.string().url().optional(),
});

const UpdateStaffBody = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  role: z.enum(["ADMIN", "CASHIER", "MANAGER"]).optional(),
  pin: z.string().length(6).regex(/^\d{6}$/).optional(),
});

const router = createRouter();

// POST /staff
router.openapi(
  createRoute({
    method: "post", path: "/staff",
    tags: ["Staff"],
    summary: "Create a new staff member",
    request: { body: { content: { "application/json": { schema: CreateStaffBody } }, required: true } },
    responses: {
      201: { description: "Created", content: { "application/json": { schema: z.object({ success: z.literal(true), data: StaffResponse }) } } },
      409: { description: "Email already in use", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const input = c.req.valid("json");
    const result = await svc.createStaff(input);
    if ("error" in result) return conflict(c, result.error ?? "EMAIL_ALREADY_EXISTS", "A staff member with this email already exists") as any;
    return created(c, result.staff);
  },
);

// GET /staff
router.openapi(
  createRoute({
    method: "get", path: "/staff",
    tags: ["Staff"],
    summary: "List staff members, filterable by role and status",
    request: {
      query: z.object({
        role: z.enum(["ADMIN", "CASHIER", "MANAGER"]).optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
        search: z.string().optional(),
        page: z.string().optional(),
        pageSize: z.string().optional(),
      }),
    },
    responses: { 200: { description: "Staff list", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.array(StaffResponse) }) } } } },
  }),
  async (c) => {
    const { role, status, search, page, pageSize } = c.req.valid("query");
    const result = await svc.listStaff({ role: role as any, status: status as any, search, page: page ? Number(page) : undefined, pageSize: pageSize ? Number(pageSize) : undefined });
    return ok(c, result.rows);
  },
);

// GET /staff/:id
router.openapi(
  createRoute({
    method: "get", path: "/staff/{id}",
    tags: ["Staff"],
    summary: "Get a staff member by public ID",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Staff member", content: { "application/json": { schema: z.object({ success: z.literal(true), data: StaffResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const staff = await svc.getStaffById(c.req.param("id"));
    if (!staff) return notFound(c, "Staff member not found") as any;
    return ok(c, staff);
  },
);

// PATCH /staff/:id
router.openapi(
  createRoute({
    method: "patch", path: "/staff/{id}",
    tags: ["Staff"],
    summary: "Update staff profile (not password — use /change-password for that)",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { "application/json": { schema: UpdateStaffBody } }, required: true },
    },
    responses: {
      200: { description: "Updated", content: { "application/json": { schema: z.object({ success: z.literal(true), data: StaffResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const result = await svc.updateStaff(c.req.param("id"), c.req.valid("json"));
    if (!result.found) return notFound(c, "Staff member not found") as any;
    return ok(c, result.staff);
  },
);

// POST /staff/:id/change-password
router.openapi(
  createRoute({
    method: "post", path: "/staff/{id}/change-password",
    tags: ["Staff"],
    summary: "Change a staff member's password (separate from profile update)",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { "application/json": { schema: z.object({ newPassword: z.string().min(8) }) } }, required: true },
    },
    responses: {
      200: { description: "Changed", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.object({ changed: z.boolean() }) }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const { newPassword } = c.req.valid("json");
    const result = await svc.changePassword(c.req.param("id"), newPassword);
    if (!result.found) return notFound(c, "Staff member not found") as any;
    return ok(c, { changed: true });
  },
);

// POST /staff/:id/archive
router.openapi(
  createRoute({
    method: "post", path: "/staff/{id}/archive",
    tags: ["Staff"],
    summary: "Archive a staff member (preserves history, blocks login)",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Archived", content: { "application/json": { schema: z.object({ success: z.literal(true), data: StaffResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const result = await svc.archiveStaff(c.req.param("id"));
    if (!result.found) return notFound(c, "Staff member not found") as any;
    return ok(c, result.staff);
  },
);

// DELETE /staff/:id
router.openapi(
  createRoute({
    method: "delete", path: "/staff/{id}",
    tags: ["Staff"],
    summary: "Hard-delete staff (blocked if referenced by sessions or orders)",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Deleted", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.object({ deleted: z.boolean() }) }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Staff in use", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const result = await svc.deleteStaff(c.req.param("id"));
    if (!result.found) return notFound(c, "Staff member not found") as any;
    if (result.blocked) return conflict(c, "STAFF_IN_USE", result.reason!) as any;
    return ok(c, { deleted: true });
  },
);
export { router as staffRouter };