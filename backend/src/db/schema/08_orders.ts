import {
  pgTable,
  bigserial,
  bigint,
  uuid,
  varchar,
  numeric,
  text,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { staffAccounts } from "./01_staff.ts";
import { floorTables } from "./04_floor_tables.ts";
import { customers } from "./05_customers.ts";
import { promotions } from "./06_promotions.ts";
import { posSessions } from "./07_pos_sessions.ts";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const orderSourceEnum = pgEnum("order_source", ["POS", "SELF_ORDER"]);

export const orderTypeEnum = pgEnum("order_type", ["DINE_IN", "TAKEAWAY"]);

export const orderStatusEnum = pgEnum("order_status", [
  "DRAFT",
  "SENT_TO_KITCHEN",
  "PREPARING",
  "READY",
  "PAID",
  "CANCELLED",
]);

export const displayStateEnum = pgEnum("display_state", [
  "ORDER_VIEW",
  "PAYMENT_VIEW",
  "COMPLETION_VIEW",
]);

export const kitchenItemStateEnum = pgEnum("kitchen_item_state", [
  "TO_COOK",
  "PREPARING",
  "COMPLETED",
]);

// ─── orders ───────────────────────────────────────────────────────────────────

export const orders = pgTable("orders", {
  id:           bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:     uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  // Reference number shown on receipt (e.g. ORD-20240620-0001)
  orderNumber:  varchar("order_number", { length: 30 }).notNull().unique(),

  sessionId:    bigint("session_id", { mode: "bigint" })
                  .references(() => posSessions.id, { onDelete: "restrict" }),

  tableId:      bigint("table_id", { mode: "bigint" })
                  .references(() => floorTables.id, { onDelete: "restrict" }),

  customerId:   bigint("customer_id", { mode: "bigint" })
                  .references(() => customers.id, { onDelete: "restrict" }),

  staffId:      bigint("staff_id", { mode: "bigint" })
                  .references(() => staffAccounts.id, { onDelete: "restrict" }),

  promotionId:  bigint("promotion_id", { mode: "bigint" })
                  .references(() => promotions.id, { onDelete: "restrict" }),

  source:       orderSourceEnum("source").notNull().default("POS"),
  type:         orderTypeEnum("type").notNull().default("DINE_IN"),
  status:       orderStatusEnum("status").notNull().default("DRAFT"),
  displayState: displayStateEnum("display_state").notNull().default("ORDER_VIEW"),

  // Financials (all stored as final computed values)
  subtotal:     numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0.00"),
  taxAmount:    numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  grandTotal:   numeric("grand_total", { precision: 12, scale: 2 }).notNull().default("0.00"),

  // Takeaway customer name (quick entry without full customer record)
  guestName:    varchar("guest_name", { length: 100 }),
  notes:        text("notes"),
  tokenNumber:  integer("token_number"),                             // counter-service token

  cancelReason: text("cancel_reason"),
  paidAt:       timestamp("paid_at", { withTimezone: true }),

  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// ─── order_items ──────────────────────────────────────────────────────────────

import { products } from "./02_products.ts";

export const orderItems = pgTable("order_items", {
  id:             bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:       uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  orderId:        bigint("order_id", { mode: "bigint" })
                    .notNull()
                    .references(() => orders.id, { onDelete: "cascade" }),

  productId:      bigint("product_id", { mode: "bigint" })
                    .notNull()
                    .references(() => products.id, { onDelete: "restrict" }),

  // Snapshot at time of order (product may change later)
  productName:    varchar("product_name", { length: 200 }).notNull(),
  quantity:       integer("quantity").notNull().default(1),
  unitPrice:      numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  taxRate:        numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0.00"),
  taxAmount:      numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  lineTotal:      numeric("line_total", { precision: 12, scale: 2 }).notNull(),

  notes:          text("notes"),                                     // special instructions
  kitchenState:   kitchenItemStateEnum("kitchen_state").notNull().default("TO_COOK"),
  kitchenNote:    text("kitchen_note"),                              // internal kitchen note

  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});
