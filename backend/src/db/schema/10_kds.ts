import {
  pgTable,
  bigserial,
  bigint,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { orders } from "./08_orders.ts";
import { orderItems } from "./08_orders.ts";
import { floorTables } from "./04_floor_tables.ts";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const kitchenTicketStatusEnum = pgEnum("kitchen_ticket_status", [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

// ─── kitchen_tickets ──────────────────────────────────────────────────────────
/**
 * One ticket per order push to the kitchen.
 * An order can produce multiple tickets (e.g. if items are added after initial push).
 * Each ticket contains a denormalised snapshot for the KDS display to avoid joins on hot path.
 */
export const kitchenTickets = pgTable("kitchen_tickets", {
  id:           bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:     uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  orderId:      bigint("order_id", { mode: "bigint" })
                  .notNull()
                  .references(() => orders.id, { onDelete: "cascade" }),

  tableId:      bigint("table_id", { mode: "bigint" })
                  .references(() => floorTables.id, { onDelete: "restrict" }),

  ticketNumber: integer("ticket_number").notNull(),                  // per-order sequence
  status:       kitchenTicketStatusEnum("status").notNull().default("PENDING"),

  // Snapshot of table/order info for KDS display (no joins needed)
  tableLabel:   text("table_label"),                                 // e.g. "T-04 / Ground Floor"
  orderType:    text("order_type"),                                   // DINE_IN | TAKEAWAY
  notes:        text("notes"),

  startedAt:    timestamp("started_at", { withTimezone: true }),     // first item picked up
  completedAt:  timestamp("completed_at", { withTimezone: true }),

  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// ─── kitchen_ticket_items ─────────────────────────────────────────────────────
/**
 * Individual line items on a KDS ticket.
 * Links back to order_items for state sync via Socket.IO kds_item_mutated event.
 */
export const kitchenTicketItems = pgTable("kitchen_ticket_items", {
  id:             bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:       uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  ticketId:       bigint("ticket_id", { mode: "bigint" })
                    .notNull()
                    .references(() => kitchenTickets.id, { onDelete: "cascade" }),

  orderItemId:    bigint("order_item_id", { mode: "bigint" })
                    .notNull()
                    .references(() => orderItems.id, { onDelete: "cascade" }),

  productName:    text("product_name").notNull(),                    // snapshot
  quantity:       integer("quantity").notNull(),
  notes:          text("notes"),

  // Mirrors order_items.kitchen_state — updated together via transaction
  state:          text("state").notNull().default("TO_COOK"),        // TO_COOK | PREPARING | COMPLETED

  startedAt:      timestamp("started_at", { withTimezone: true }),
  completedAt:    timestamp("completed_at", { withTimezone: true }),

  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});
