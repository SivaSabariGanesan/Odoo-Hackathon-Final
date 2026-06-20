import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { authorize } from "../middleware/authorize.ts";
import { db } from "../db/index.ts";
import { kitchenTickets, kitchenTicketItems } from "../db/schema/index.ts";
import { eq } from "drizzle-orm";
import { ok, err } from "../utils/response.ts";

const router = createRouter();
const T = ["KDS"];

router.use("/api/v1/kds/*", authenticate, authorize(["ADMIN", "KITCHEN"]));

// ─── GET /api/v1/kds/tickets ──────────────────────────────────────────────────
router.openapi(
  createRoute({
    method: "get", path: "/api/v1/kds/tickets", tags: T,
    summary: "List active kitchen tickets",
    responses: { 200: { description: "Ticket list" } },
  }),
  async (c) => {
    const tickets = await db
      .select()
      .from(kitchenTickets)
      .where(eq(kitchenTickets.status, "PENDING"))
      .orderBy(kitchenTickets.createdAt);
    return ok(c, tickets);
  }
);

// ─── PATCH /api/v1/kds/tickets/:id/start ─────────────────────────────────────
router.openapi(
  createRoute({
    method: "patch", path: "/api/v1/kds/tickets/{id}/start", tags: T,
    summary: "Start preparing a ticket",
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: { description: "Ticket started" } },
  }),
  async (c) => {
    try {
      const id = BigInt(c.req.param("id"));
      const [ticket] = await db
        .update(kitchenTickets)
        .set({ status: "IN_PROGRESS", startedAt: new Date(), updatedAt: new Date() })
        .where(eq(kitchenTickets.id, id))
        .returning();
      if (!ticket) return err(c, "Ticket not found", 404);
      return ok(c, ticket);
    } catch (e: any) {
      return err(c, e.message, 400);
    }
  }
);

// ─── PATCH /api/v1/kds/tickets/:id/complete ──────────────────────────────────
router.openapi(
  createRoute({
    method: "patch", path: "/api/v1/kds/tickets/{id}/complete", tags: T,
    summary: "Mark ticket as completed",
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: { description: "Ticket completed" } },
  }),
  async (c) => {
    try {
      const id = BigInt(c.req.param("id"));
      const [ticket] = await db
        .update(kitchenTickets)
        .set({ status: "COMPLETED", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(kitchenTickets.id, id))
        .returning();
      if (!ticket) return err(c, "Ticket not found", 404);
      return ok(c, ticket);
    } catch (e: any) {
      return err(c, e.message, 400);
    }
  }
);

// ─── PATCH /api/v1/kds/items/:id/complete ────────────────────────────────────
router.openapi(
  createRoute({
    method: "patch", path: "/api/v1/kds/items/{id}/complete", tags: T,
    summary: "Mark individual ticket item as completed",
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: { description: "Item completed" } },
  }),
  async (c) => {
    try {
      const id = BigInt(c.req.param("id"));
      const [item] = await db
        .update(kitchenTicketItems)
        .set({ state: "COMPLETED", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(kitchenTicketItems.id, id))
        .returning();
      if (!item) return err(c, "Item not found", 404);
      return ok(c, item);
    } catch (e: any) {
      return err(c, e.message, 400);
    }
  }
);

export { router as kdsRouter };
