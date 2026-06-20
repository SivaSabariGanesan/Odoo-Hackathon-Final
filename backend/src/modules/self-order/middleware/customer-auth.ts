import { createMiddleware } from "hono/factory";
import { authService } from "../services/auth.service.ts";

export const customerAuthMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "UNAUTHORIZED", message: "Missing or invalid token" }, 401);
  }
  
  const token = authHeader.split(" ")[1];
  if (!token) return c.json({ error: "UNAUTHORIZED", message: "Invalid token format" }, 401);
  const decoded = authService.verifyCustomerToken(token);
  
  if (!decoded) {
    return c.json({ error: "SESSION_EXPIRED", message: "Session expired or invalid" }, 401);
  }
  
  // Set tableId in context for downstream routes
  c.set("tableId", decoded.tableId);
  await next();
});
