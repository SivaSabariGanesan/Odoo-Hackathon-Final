import { OpenAPIHono } from "@hono/zod-openapi";

/**
 * Creates a typed OpenAPI app instance.
 * All route files should import and register against this.
 */
export function createRouter() {
  return new OpenAPIHono();
}
