import {
  pgTable,
  bigserial,
  bigint,
  uuid,
  varchar,
  numeric,
  boolean,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { orders } from "./08_orders.ts";
import { paymentMethods } from "./03_payment_methods.ts";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
]);

// ─── payments ─────────────────────────────────────────────────────────────────

export const payments = pgTable("payments", {
  id:               bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:         uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  orderId:          bigint("order_id", { mode: "bigint" })
                      .notNull()
                      .references(() => orders.id, { onDelete: "restrict" }),

  methodId:         bigint("method_id", { mode: "bigint" })
                      .notNull()
                      .references(() => paymentMethods.id, { onDelete: "restrict" }),

  amount:           numeric("amount", { precision: 12, scale: 2 }).notNull(),
  changeAmount:     numeric("change_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),

  // For UPI / card gateways
  transactionRef:   varchar("transaction_ref", { length: 255 }),
  gatewayResponse:  text("gateway_response"),                        // raw JSON string

  status:           paymentStatusEnum("status").notNull().default("PENDING"),
  paidAt:           timestamp("paid_at", { withTimezone: true }),

  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// ─── receipts ─────────────────────────────────────────────────────────────────

export const receipts = pgTable("receipts", {
  id:             bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:       uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  orderId:        bigint("order_id", { mode: "bigint" })
                    .notNull()
                    .references(() => orders.id, { onDelete: "restrict" }),

  receiptNumber:  varchar("receipt_number", { length: 30 }).notNull().unique(),

  isPrinted:      boolean("is_printed").notNull().default(false),
  printedAt:      timestamp("printed_at", { withTimezone: true }),

  isEmailSent:    boolean("is_email_sent").notNull().default(false),
  emailSentAt:    timestamp("email_sent_at", { withTimezone: true }),
  emailAddress:   varchar("email_address", { length: 255 }),

  // Snapshot of full receipt payload (JSON) for reprint / archive
  receiptData:    text("receipt_data"),

  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});
