import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthUser } from "../types/auth.ts";

type AppEnv = {
  Variables: {
    user: AuthUser;
  };
};

/**
 * Creates a typed OpenAPI app instance with auth context.
 */
export function createRouter() {
  return new OpenAPIHono<AppEnv>();
}
