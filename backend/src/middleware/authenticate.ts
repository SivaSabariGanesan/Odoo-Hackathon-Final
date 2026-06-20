import type { MiddlewareHandler } from "hono";
import { verifyAccessToken } from "../utils/token.ts";
import { db } from "../db/index.ts";
import { staffAccounts } from "../db/schema/index.ts";
import { eq } from "drizzle-orm";
import { err } from "../utils/response.ts";

/**
 * authenticate()
 * Verifies the Bearer JWT, loads the user from DB, and attaches to context.
 * Rejects archived/deleted accounts even with a valid token.
 */
export const authenticate: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return err(c, 401, "UNAUTHORIZED", "Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return err(c, 401, "UNAUTHORIZED", "Invalid or expired access token");
  }

  // Load fresh user from DB — catch role/status changes since token was issued
  const [user] = await db
    .select({
      id:       staffAccounts.id,
      publicId: staffAccounts.publicId,
      email:    staffAccounts.email,
      name:     staffAccounts.name,
      role:     staffAccounts.role,
      status:   staffAccounts.status,
    })
    .from(staffAccounts)
    .where(eq(staffAccounts.publicId, payload.sub))
    .limit(1);

  if (!user) return err(c, 401, "UNAUTHORIZED", "Account not found");
  if (user.status === "ARCHIVED") return err(c, 403, "FORBIDDEN", "Account is archived");
  if (user.status === "INACTIVE") return err(c, 403, "FORBIDDEN", "Account is inactive");

  c.set("user", user);
  await next();
};
