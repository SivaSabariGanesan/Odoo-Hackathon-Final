import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../../../lib/openapi.ts";
import { getUpsellSuggestions } from "../controllers/upsell.controller.ts";
import { customerAuthMiddleware } from "../middleware/customer-auth.ts";

const router = createRouter();

router.openapi(
  createRoute({
    method: "get",
    path: "/s/{token}/upsell",
    summary: "Get Smart Upseller Suggestions",
    description: "Analyzes the current cart and returns complementary items and threshold nudges.",
    tags: ["Self-Order"],
    security: [{ bearerAuth: [] }],
    middleware: [customerAuthMiddleware] as const,
    request: {
      params: z.object({
        token: z.string().uuid("Invalid UUID"),
      }),
    },
    responses: {
      200: {
        description: "Upsell suggestions retrieved successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              data: z.object({
                message: z.string(),
                candidates: z.array(z.object({
                  type: z.enum(["NUDGE", "COMPLEMENT"]),
                  text: z.string(),
                  productId: z.string().optional(),
                  priority: z.number(),
                }))
              })
            }),
          },
        },
      },
      400: { description: "Bad Request" },
      404: { description: "Invalid QR token" },
      500: { description: "Internal Server Error" },
    },
  }),
  getUpsellSuggestions
);

export { router as upsellRoutes };
