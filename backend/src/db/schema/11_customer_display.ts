import {
  pgTable,
  bigserial,
  bigint,
  uuid,
  text,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { orders } from "./08_orders.ts";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const customerDisplayStateEnum = pgEnum("customer_display_state", [
  "IDLE",
  "ORDER_VIEW",
  "PAYMENT_VIEW",
  "COMPLETION_VIEW",
]);

// ─── customer_display_sessions ────────────────────────────────────────────────
/**
 * One row per physical customer-facing display terminal.
 * Updated in real-time via Socket.IO customer_display_updated event.
 */
export const customerDisplaySessions = pgTable("customer_display_sessions", {
  id:            bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:      uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  terminalId:    uuid("terminal_id").notNull().unique().default(sql`gen_random_uuid()`), // device identifier

  activeOrderId: bigint("active_order_id", { mode: "bigint" })
                   .references(() => orders.id, { onDelete: "set null" }),

  displayState:  customerDisplayStateEnum("display_state").notNull().default("IDLE"),

  // Last pushed payload snapshot (JSON string) — avoids refetch on reconnect
  lastPayload:   text("last_payload"),

  isOnline:      boolean("is_online").notNull().default(false),
  lastSeenAt:    timestamp("last_seen_at", { withTimezone: true }),

  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});
