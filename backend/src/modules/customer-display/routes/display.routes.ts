import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../../../lib/openapi.ts";
import { authenticate } from "../../../middleware/authenticate.ts";
import { authorize } from "../../../middleware/authorize.ts";
import { customerDisplayService } from "../services/display.service.ts";
import { displayStateUpdateSchema, displayStateResponseSchema } from "../validators/display.schema.ts";

const router = createRouter();

// State update (POS pushing new state) requires staff auth
router.use("/terminal/:terminalId/state", authenticate, authorize(["ADMIN", "CASHIER"]));

router.openapi(
  createRoute({
    method: "get",
    path: "/terminal/{terminalId}",
    tags: ["Customer Display"],
    summary: "Get Display State",
    description: "Returns the current state and payload for a customer display terminal.",
    security: [], // Usually public for local network devices, or device-authenticated
    request: {
      params: z.object({
        terminalId: z.string().uuid(),
      }),
    },
    responses: {
      200: {
        description: "Terminal State",
        content: {
          "application/json": {
            schema: displayStateResponseSchema,
          },
        },
      },
    },
  }),
  async (c) => {
    const { terminalId } = c.req.valid("param");
    const state = await customerDisplayService.getTerminalState(terminalId);
    return c.json(state, 200);
  }
);

router.openapi(
  createRoute({
    method: "put",
    path: "/terminal/{terminalId}/state",
    tags: ["Customer Display"],
    summary: "Update Display State",
    description: "Called by the POS to push a new state to the customer display.",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        terminalId: z.string().uuid(),
      }),
      body: {
        content: {
          "application/json": {
            schema: displayStateUpdateSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Updated Terminal State",
        content: {
          "application/json": {
            schema: displayStateResponseSchema,
          },
        },
      },
    },
  }),
  async (c) => {
    const { terminalId } = c.req.valid("param");
    const body = c.req.valid("json");
    
    const updatedState = await customerDisplayService.updateTerminalState(terminalId, body);
    
    // MOCK: Emit socket event for Siva's system
    // emit("customer_display_updated", { terminalId, state: updatedState.displayState });

    return c.json(updatedState, 200);
  }
);

export { router as customerDisplayRoutes };
