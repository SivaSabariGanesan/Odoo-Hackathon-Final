import { createRoute } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";
import { authenticate } from "../middleware/authenticate.ts";
import * as authService from "../services/auth.service.ts";
import {
  signupSchema, loginSchema, refreshSchema, changePasswordSchema,
} from "../validators/auth.validator.ts";
import { ok, created, err } from "../utils/response.ts";
import { ROLE_PERMISSIONS } from "../types/auth.ts";
import type { Role } from "../types/auth.ts";

const router = createRouter();
const T = ["Auth"];

// Apply authenticate to all protected auth routes
router.use("/api/v1/auth/me",              authenticate);
router.use("/api/v1/auth/logout",          authenticate);
router.use("/api/v1/auth/change-password", authenticate);

// ─── POST /api/v1/auth/signup ─────────────────────────────────────────────────
router.openapi(
  createRoute({
    method: "post", path: "/api/v1/auth/signup", tags: T, security: [],
    summary: "Admin signup (first-time setup)",
    request:   { body: { content: { "application/json": { schema: signupSchema } } } },
    responses: { 201: { description: "Account created" }, 409: { description: "Email in use" } },
  }),
  async (c) => {
    try {
      const input = signupSchema.parse(await c.req.json());
      const result = await authService.signup(
        input,
        c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip"),
        c.req.header("user-agent")
      );
      return created(c, result);
    } catch (e: any) {
      return err(c, e.message, e.status ?? 400);
    }
  }
);

// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────
router.openapi(
  createRoute({
    method: "post", path: "/api/v1/auth/login", tags: T, security: [],
    summary: "Login — returns access + refresh tokens",
    request:   { body: { content: { "application/json": { schema: loginSchema } } } },
    responses: { 200: { description: "Logged in" }, 401: { description: "Invalid credentials" } },
  }),
  async (c) => {
    try {
      const input = loginSchema.parse(await c.req.json());
      const result = await authService.login(
        input,
        c.req.header("x-forwarded-for"),
        c.req.header("user-agent")
      );
      return ok(c, result);
    } catch (e: any) {
      return err(c, e.message, e.status ?? 400);
    }
  }
);

// ─── POST /api/v1/auth/refresh ────────────────────────────────────────────────
router.openapi(
  createRoute({
    method: "post", path: "/api/v1/auth/refresh", tags: T, security: [],
    summary: "Rotate refresh token — returns new token pair",
    request:   { body: { content: { "application/json": { schema: refreshSchema } } } },
    responses: { 200: { description: "Tokens rotated" }, 401: { description: "Invalid token" } },
  }),
  async (c) => {
    try {
      const { refreshToken } = refreshSchema.parse(await c.req.json());
      const result = await authService.refresh(
        refreshToken,
        c.req.header("x-forwarded-for"),
        c.req.header("user-agent")
      );
      return ok(c, result);
    } catch (e: any) {
      return err(c, e.message, e.status ?? 400);
    }
  }
);

// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────
router.openapi(
  createRoute({
    method: "post", path: "/api/v1/auth/logout", tags: T,
    summary: "Logout — revokes the provided refresh token",
    request:   { body: { content: { "application/json": { schema: refreshSchema } } } },
    responses: { 200: { description: "Logged out" } },
  }),
  async (c) => {
    try {
      const { refreshToken } = refreshSchema.parse(await c.req.json());
      await authService.logout(refreshToken);
      return ok(c, { message: "Logged out successfully" });
    } catch (e: any) {
      return err(c, e.message, e.status ?? 400);
    }
  }
);

// ─── GET /api/v1/auth/me ──────────────────────────────────────────────────────
router.openapi(
  createRoute({
    method: "get", path: "/api/v1/auth/me", tags: T,
    summary: "Current user — profile + permissions",
    responses: { 200: { description: "Current user" }, 401: { description: "Unauthorized" } },
  }),
  (c) => {
    const user = c.get("user");
    return ok(c, {
      id:          user.publicId,
      name:        user.name,
      email:       user.email,
      role:        user.role,
      permissions: ROLE_PERMISSIONS[user.role as Role],
    });
  }
);

// ─── PATCH /api/v1/auth/change-password ───────────────────────────────────────
router.openapi(
  createRoute({
    method: "patch", path: "/api/v1/auth/change-password", tags: T,
    summary: "Change own password",
    request:   { body: { content: { "application/json": { schema: changePasswordSchema } } } },
    responses: { 200: { description: "Password changed" }, 400: { description: "Wrong current password" } },
  }),
  async (c) => {
    try {
      const user  = c.get("user");
      const input = changePasswordSchema.parse(await c.req.json());
      await authService.changePassword(user.id as bigint, input);
      return ok(c, { message: "Password updated successfully" });
    } catch (e: any) {
      return err(c, e.message, e.status ?? 400);
    }
  }
);

export { router as authRouter };
