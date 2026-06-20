import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../../../lib/openapi.ts";
import { handleChatRequest } from "../controllers/chat.controller.ts";
import { customerAuthMiddleware } from "../middleware/customer-auth.ts";
import { ChatRequestSchema } from "../validators/chat.validator.ts";

const router = createRouter();

router.openapi(
  createRoute({
    method: "post",
    path: "/s/{token}/chat",
    tags: ["Self Ordering", "AI Chat"],
    summary: "Customer AI Chatbot",
    description: "Stateless RAG-grounded chat endpoint answering menu questions.",
    security: [{ bearerAuth: [] }],
    middleware: [customerAuthMiddleware] as const,
    request: {
      params: z.object({ token: z.string().uuid() }),
      body: {
        content: {
          "application/json": {
            schema: ChatRequestSchema
          }
        }
      }
    },
    responses: {
      200: {
        description: "AI Response",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.object({
                response: z.string()
              })
            })
          }
        }
      },
      400: {
        description: "Bad Request"
      }
    }
  }),
  handleChatRequest
);

export { router as chatRoutes };
