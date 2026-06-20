import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { authorize } from "../middleware/authorize.ts";
import * as staffService from "../services/staff.service.ts";
import {
  createStaffSchema, updateStaffSchema, resetPasswordSchema,
} from "../validators/auth.validator.ts";
import { ok, created, err } from "../utils/response.ts";

const router = createRouter();
const T = ["Staff"];

// All staff routes require ADMIN — applied via router.use before openapi handlers
router.use("/api/v1/staff", authenticate, authorize(["ADMIN"]));
router.use("/api/v1/staff/*", authenticate, authorize(["ADMIN"]));

// ─── GET /api/v1/staff ────────────────────────────────────────────────────────
router.openapi(
  createRoute({
    method: "get", path: "/api/v1/staff", tags: T,
    summary: "List all staff (Admin only)",
    responses: { 200: { description: "Staff list" } },
  }),
  async (c) => {
    const list = await staffService.listStaff();
    return ok(c, list);
  }
);

// ─── POST /api/v1/staff ───────────────────────────────────────────────────────
router.openapi(
  createRoute({
    method: "post", path: "/api/v1/staff", tags: T,
    summary: "Create cashier or kitchen staff (Admin only)",
    request: { body: { content: { "application/json": { schema: createStaffSchema } } } },
    responses: { 201: { description: "Staff created" }, 409: { description: "Email in use" } },
  }),
  async (c) => {
    try {
      const input = createStaffSchema.parse(await c.req.json());
      return created(c, await staffService.createStaff(input));
    } catch (e: any) {
      return err(c, e.message, e.status ?? 400);
    }
  }
);

// ─── GET /api/v1/staff/:id ────────────────────────────────────────────────────
router.openapi(
  createRoute({
    method: "get", path: "/api/v1/staff/{id}", tags: T,
    summary: "Get staff by ID",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: { 200: { description: "Staff member" }, 404: { description: "Not found" } },
  }),
  async (c) => {
    try {
      return ok(c, await staffService.getStaffById(c.req.param("id")));
    } catch (e: any) {
      return err(c, e.message, e.status ?? 400);
    }
  }
);

// ─── PATCH /api/v1/staff/:id ──────────────────────────────────────────────────
router.openapi(
  createRoute({
    method: "patch", path: "/api/v1/staff/{id}", tags: T,
    summary: "Update staff name / phone / role",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { "application/json": { schema: updateStaffSchema } } },
    },
    responses: { 200: { description: "Updated" } },
  }),
  async (c) => {
    try {
      const input = updateStaffSchema.parse(await c.req.json());
      return ok(c, await staffService.updateStaff(c.req.param("id"), input));
    } catch (e: any) {
      return err(c, e.message, e.status ?? 400);
    }
  }
);

// ─── DELETE /api/v1/staff/:id ─────────────────────────────────────────────────
router.openapi(
  createRoute({
    method: "delete", path: "/api/v1/staff/{id}", tags: T,
    summary: "Soft-delete staff",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: { 200: { description: "Deleted" } },
  }),
  async (c) => {
    try {
      await staffService.deleteStaff(c.req.param("id"));
      return ok(c, { message: "Staff deleted" });
    } catch (e: any) {
      return err(c, e.message, e.status ?? 400);
    }
  }
);

// ─── PATCH /api/v1/staff/:id/archive ─────────────────────────────────────────
router.openapi(
  createRoute({
    method: "patch", path: "/api/v1/staff/{id}/archive", tags: T,
    summary: "Archive staff — revokes all sessions",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: { 200: { description: "Archived" } },
  }),
  async (c) => {
    try {
      return ok(c, await staffService.archiveStaff(c.req.param("id")));
    } catch (e: any) {
      return err(c, e.message, e.status ?? 400);
    }
  }
);

// ─── PATCH /api/v1/staff/:id/unarchive ───────────────────────────────────────
router.openapi(
  createRoute({
    method: "patch", path: "/api/v1/staff/{id}/unarchive", tags: T,
    summary: "Unarchive staff",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: { 200: { description: "Unarchived" } },
  }),
  async (c) => {
    try {
      return ok(c, await staffService.unarchiveStaff(c.req.param("id")));
    } catch (e: any) {
      return err(c, e.message, e.status ?? 400);
    }
  }
);

// ─── PATCH /api/v1/staff/:id/reset-password ──────────────────────────────────
router.openapi(
  createRoute({
    method: "patch", path: "/api/v1/staff/{id}/reset-password", tags: T,
    summary: "Admin resets a staff member password",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { "application/json": { schema: resetPasswordSchema } } },
    },
    responses: { 200: { description: "Password reset" } },
  }),
  async (c) => {
    try {
      const { newPassword } = resetPasswordSchema.parse(await c.req.json());
      await staffService.resetStaffPassword(c.req.param("id"), newPassword);
      return ok(c, { message: "Password reset successfully" });
    } catch (e: any) {
      return err(c, e.message, e.status ?? 400);
    }
  }
);

export { router as staffRouter };
