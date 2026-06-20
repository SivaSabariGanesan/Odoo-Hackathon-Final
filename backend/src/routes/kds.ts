import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { authorize } from "../middleware/authorize.ts";
import * as svc from "../services/kds.service.ts";
import { ok, notFound, conflict } from "../utils/response.ts";

const ErrorResponse = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string() }),
});

const KdsItemState = z.enum(["TO_COOK", "PREPARING", "COMPLETED"]);
const TicketStatus = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

const TicketItemResponse = z.object({
  id: z.any(),
  publicId: z.string().uuid(),
  productName: z.string(),
  quantity: z.number(),
  state: KdsItemState,
  notes: z.string().nullable(),
}).passthrough();

const TicketResponse = z.object({
  id: z.any(),
  publicId: z.string().uuid(),
  ticketNumber: z.number(),
  status: TicketStatus,
  tableLabel: z.string().nullable(),
  orderType: z.string().nullable(),
  items: z.array(TicketItemResponse),
}).passthrough();

const router = createRouter();

// KDS routes require authentication — Kitchen, Cashier, or Admin can access
router.use("/kds/*", authenticate, authorize(["ADMIN", "CASHIER", "KITCHEN"]));

// GET /kds/tickets
router.openapi(
  createRoute({
    method: "get",
    path: "/kds/tickets",
    tags: ["KDS"],
    summary: "List active KDS tickets (PENDING + IN_PROGRESS)",
    description: "Only products with kds_visible = true are surfaced. Filterable by category and search.",
    request: {
      query: z.object({
        categoryId: z.string().optional().openapi({ description: "Internal category ID for filtering" }),
        search: z.string().optional().openapi({ description: "Search by product name" }),
        page: z.string().optional(),
        pageSize: z.string().optional(),
      }),
    },
    responses: {
      200: {
        description: "Active tickets",
        content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.array(TicketResponse) }) } },
      },
    },
  }),
  async (c) => {
    const { categoryId, search, page, pageSize } = c.req.valid("query");
    const tickets = await svc.listActiveTickets({
      categoryId: categoryId ? BigInt(categoryId) : undefined,
      search,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    return ok(c, tickets as any);
  },
);

// GET /kds/tickets/order/:orderPublicId
router.openapi(
  createRoute({
    method: "get",
    path: "/kds/tickets/order/{orderPublicId}",
    tags: ["KDS"],
    summary: "Get all KDS tickets for a specific order",
    request: { params: z.object({ orderPublicId: z.string().uuid() }) },
    responses: {
      200: {
        description: "Tickets for the order",
        content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.array(TicketResponse) }) } },
      },
      404: { description: "Order not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const tickets = await svc.getTicketsByOrder(c.req.param("orderPublicId"));
    if (!tickets) return notFound(c, "Order not found") as any;
    return ok(c, tickets);
  },
);

// POST /kds/items/:itemPublicId/advance
router.openapi(
  createRoute({
    method: "post",
    path: "/kds/items/{itemPublicId}/advance",
    tags: ["KDS"],
    summary: "Advance a single KDS item to the next state (TO_COOK → PREPARING → COMPLETED)",
    description: "Also mirrors the state change onto order_items.kitchen_state. Auto-completes the ticket when all items reach COMPLETED.",
    request: { params: z.object({ itemPublicId: z.string().uuid() }) },
    responses: {
      200: {
        description: "Item advanced",
        content: { "application/json": { schema: z.object({ success: z.literal(true), data: TicketItemResponse }) } },
      },
      404: { description: "Item not found", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Item already at terminal state", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const result = await svc.advanceItemState(c.req.param("itemPublicId"));
    if ("error" in result) {
      const code = result.error ?? "KDS_INVALID_STATE_TRANSITION";
      if (code === "NOT_FOUND") return notFound(c, "Kitchen ticket item not found") as any;
      return conflict(c, code, "Cannot advance item state") as any;
    }
    return ok(c, result.ticketItem);
  },
);

// POST /kds/tickets/:ticketPublicId/advance
router.openapi(
  createRoute({
    method: "post",
    path: "/kds/tickets/{ticketPublicId}/advance",
    tags: ["KDS"],
    summary: "Advance all open items on a ticket at once (click-on-ticket-card action)",
    description: "Moves all still-open items to the next stage. PENDING → IN_PROGRESS, IN_PROGRESS → COMPLETED.",
    request: { params: z.object({ ticketPublicId: z.string().uuid() }) },
    responses: {
      200: {
        description: "Ticket advanced",
        content: { "application/json": { schema: z.object({ success: z.literal(true), data: TicketResponse }) } },
      },
      404: { description: "Ticket not found", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Ticket already completed or cancelled", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const result = await svc.advanceTicket(c.req.param("ticketPublicId"));
    if ("error" in result) {
      const code = result.error ?? "KDS_INVALID_STATE_TRANSITION";
      if (code === "NOT_FOUND") return notFound(c, "Ticket not found") as any;
      return conflict(c, code, "Cannot advance ticket state") as any;
    }
    return ok(c, result.ticket);
  },
);

export { router as kdsRouter };
