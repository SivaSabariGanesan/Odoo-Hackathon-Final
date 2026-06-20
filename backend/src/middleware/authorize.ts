import type { MiddlewareHandler } from "hono";
import type { Role } from "../types/auth.ts";
import { err } from "../utils/response.ts";

/**
 * authorize(roles)
 * Must be used after authenticate().
 * Passes only if the authenticated user's role is in the allowed list.
 *
 * Usage:
 *   app.get("/admin-only", authenticate, authorize(["ADMIN"]), handler)
 *   app.get("/pos",        authenticate, authorize(["ADMIN", "CASHIER"]), handler)
 *   app.get("/kds",        authenticate, authorize(["ADMIN", "KITCHEN"]), handler)
 */
export function authorize(roles: Role[]): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get("user");
    if (!user) return err(c, 401, "UNAUTHENTICATED", "User not authenticated");
    if (!roles.includes(user.role as Role)) {
      return err(c, 403, "FORBIDDEN", "Insufficient permissions");
    }
    await next();
  };
}
