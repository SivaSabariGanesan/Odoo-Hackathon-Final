import { eq, and, inArray, sql, ne } from "drizzle-orm";
import { db } from "../db/index.ts";
import { kitchenTickets, kitchenTicketItems, orderItems, products } from "../db/schema/index.ts";
import { emit } from "../utils/events.ts";

// ─── List active tickets for KDS board ───────────────────────────────────────

export async function listActiveTickets(params: {
  categoryId?: bigint;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { page = 1, pageSize = 50 } = params;
  const offset = (page - 1) * pageSize;

  const tickets = await db.query.kitchenTickets.findMany({
    where: (t, { inArray }) => inArray(t.status, ["PENDING", "IN_PROGRESS"]),
    with: {
      items: {
        with: {
          orderItem: {
            with: {
              product: {
                columns: { id: true, publicId: true, name: true, categoryId: true },
              },
            },
          },
        },
      },
      order: { columns: { orderNumber: true, publicId: true, type: true } },
    },
    orderBy: (t, { asc }) => [asc(t.createdAt)],
    limit: pageSize,
    offset,
  });

  // Filter by category or search if needed (post-filter — items are in-memory already)
  let result = tickets;

  if (params.categoryId || params.search) {
    result = tickets
      .map((ticket) => {
        const filteredItems = ticket.items.filter((ti) => {
          const product = ti.orderItem?.product;
          if (!product) return false;

          // kds_visible flag — column added by migration 002, check via raw value
          // The schema type doesn't know about kds_visible yet; we trust the DB
          const kdsVisible = (product as any).kds_visible ?? (product as any).kdsVisible ?? true;
          if (!kdsVisible) return false;

          if (params.categoryId && product.categoryId !== params.categoryId) return false;
          if (params.search) {
            if (!product.name.toLowerCase().includes(params.search.toLowerCase())) return false;
          }
          return true;
        });
        return { ...ticket, items: filteredItems };
      })
      .filter((t) => t.items.length > 0);
  } else {
    // Still enforce kds_visible
    result = tickets.map((ticket) => ({
      ...ticket,
      items: ticket.items.filter((ti) => {
        const product = ti.orderItem?.product as any;
        return (product?.kds_visible ?? product?.kdsVisible ?? true) !== false;
      }),
    })).filter((t) => t.items.length > 0);
  }

  return result;
}

// ─── Advance a single item's KDS state ───────────────────────────────────────

const KDS_STATE_TRANSITIONS: Record<string, string> = {
  TO_COOK: "PREPARING",
  PREPARING: "COMPLETED",
};

export async function advanceItemState(ticketItemPublicId: string) {
  const ticketItem = await db.query.kitchenTicketItems.findFirst({
    where: eq(kitchenTicketItems.publicId, ticketItemPublicId),
    with: { ticket: true, orderItem: true },
  });
  if (!ticketItem) return { error: "NOT_FOUND" as const };

  const nextState = KDS_STATE_TRANSITIONS[ticketItem.state];
  if (!nextState) return { error: "KDS_INVALID_STATE_TRANSITION" as const };

  const now = new Date();

  await db.transaction(async (tx) => {
    // Update ticket item
    await tx.update(kitchenTicketItems)
      .set({
        state: nextState,
        startedAt: nextState === "PREPARING" ? now : ticketItem.startedAt,
        completedAt: nextState === "COMPLETED" ? now : ticketItem.completedAt,
        updatedAt: now,
      })
      .where(eq(kitchenTicketItems.publicId, ticketItemPublicId));

    // Mirror onto order_items.kitchen_state
    if (ticketItem.orderItem) {
      await tx.update(orderItems)
        .set({ kitchenState: nextState as any, updatedAt: now })
        .where(eq(orderItems.id, ticketItem.orderItem.id));
    }

    // Check if all items on the ticket are now COMPLETED → auto-complete ticket
    const allItems = await tx.query.kitchenTicketItems.findMany({
      where: eq(kitchenTicketItems.ticketId, ticketItem.ticketId),
    });

    const allCompleted = allItems.every(
      (i) => (i.id === ticketItem.id ? nextState : i.state) === "COMPLETED",
    );

    if (allCompleted) {
      await tx.update(kitchenTickets)
        .set({ status: "COMPLETED", completedAt: now, updatedAt: now })
        .where(eq(kitchenTickets.id, ticketItem.ticketId));
    } else if (nextState === "PREPARING") {
      // At least one item preparing — set ticket to IN_PROGRESS
      await tx.update(kitchenTickets)
        .set({ status: "IN_PROGRESS", startedAt: now, updatedAt: now })
        .where(and(
          eq(kitchenTickets.id, ticketItem.ticketId),
          eq(kitchenTickets.status, "PENDING"),
        ));
    }
  });

  const updatedTicket = await db.query.kitchenTickets.findFirst({
    where: eq(kitchenTickets.id, ticketItem.ticketId),
    with: { items: true },
  });

  emit("kds_item_mutated", {
    ticketItemId: ticketItemPublicId,
    ticketId: ticketItem.ticket.publicId,
    orderId: ticketItem.ticket.orderId,
    newState: nextState,
  });

  return { ticketItem: { ...ticketItem, state: nextState }, ticket: updatedTicket };
}

// ─── Advance entire ticket (click on ticket card) ────────────────────────────
// Advances all still-open items to the next stage at once.

export async function advanceTicket(ticketPublicId: string) {
  const ticket = await db.query.kitchenTickets.findFirst({
    where: eq(kitchenTickets.publicId, ticketPublicId),
    with: { items: true },
  });
  if (!ticket) return { error: "NOT_FOUND" as const };
  if (ticket.status === "COMPLETED" || ticket.status === "CANCELLED") {
    return { error: "KDS_INVALID_STATE_TRANSITION" as const };
  }

  // Determine target state based on current ticket state
  const targetState = ticket.status === "PENDING" ? "PREPARING" : "COMPLETED";
  const now = new Date();

  await db.transaction(async (tx) => {
    // Advance all non-completed items
    const openItems = ticket.items.filter((i) => i.state !== "COMPLETED");

    for (const item of openItems) {
      await tx.update(kitchenTicketItems)
        .set({
          state: targetState,
          startedAt: targetState === "PREPARING" ? now : item.startedAt,
          completedAt: targetState === "COMPLETED" ? now : null,
          updatedAt: now,
        })
        .where(eq(kitchenTicketItems.id, item.id));

      if (item.orderItemId) {
        await tx.update(orderItems)
          .set({ kitchenState: targetState as any, updatedAt: now })
          .where(eq(orderItems.id, item.orderItemId));
      }
    }

    // Update ticket status
    const newTicketStatus = targetState === "PREPARING" ? "IN_PROGRESS" : "COMPLETED";
    await tx.update(kitchenTickets)
      .set({
        status: newTicketStatus,
        startedAt: newTicketStatus === "IN_PROGRESS" ? now : ticket.startedAt,
        completedAt: newTicketStatus === "COMPLETED" ? now : null,
        updatedAt: now,
      })
      .where(eq(kitchenTickets.id, ticket.id));
  });

  const updatedTicket = await db.query.kitchenTickets.findFirst({
    where: eq(kitchenTickets.id, ticket.id),
    with: { items: true },
  });

  emit("kds_item_mutated", {
    ticketId: ticketPublicId,
    targetState,
    bulkAdvance: true,
  });

  return { ticket: updatedTicket };
}

// ─── Get ticket by order ──────────────────────────────────────────────────────

export async function getTicketsByOrder(orderPublicId: string) {
  const { orders } = await import("../db/schema/index.ts");
  const order = await db.query.orders.findFirst({
    where: eq(orders.publicId, orderPublicId),
  });
  if (!order) return null;

  return db.query.kitchenTickets.findMany({
    where: eq(kitchenTickets.orderId, order.id),
    with: { items: true },
    orderBy: (t, { asc }) => [asc(t.ticketNumber)],
  });
}
