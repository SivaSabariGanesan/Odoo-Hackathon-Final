import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";

const router = createRouter();

router.openapi(
  createRoute({
    method: "get",
    path: "/health",
    tags: ["Auth"],
    summary: "Health check",
    description: "Returns API status and server timestamp.",
    security: [],                          // public — no JWT needed
    responses: {
      200: {
        description: "API is healthy",
        content: {
          "application/json": {
            schema: z.object({
              status:      z.literal("healthy"),
              timestamp:   z.string().datetime(),
              environment: z.string(),
            }),
          },
        },
      },
    },
  }),
  (c) =>
    c.json({
      status:      "healthy" as const,
      timestamp:   new Date().toISOString(),
      environment: process.env["NODE_ENV"] ?? "development",
    })
);

export { router as healthRouter };
