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
  "SUCCESS",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
  "REFUNDED",
]);

// ─── payment_transactions ─────────────────────────────────────────────────────
// One record per checkout attempt. Multiple attempts allowed per order (on failure/retry).

export const paymentTransactions = pgTable("payment_transactions", {
  id:               bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:         uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  orderId:          bigint("order_id", { mode: "bigint" })
                      .notNull()
                      .references(() => orders.id, { onDelete: "restrict" }),

  methodId:         bigint("method_id", { mode: "bigint" })
                      .notNull()
                      .references(() => paymentMethods.id, { onDelete: "restrict" }),

  amount:           numeric("amount", { precision: 12, scale: 2 }).notNull(),

  // Cash-specific
  receivedAmount:   numeric("received_amount", { precision: 12, scale: 2 }),
  changeAmount:     numeric("change_amount",   { precision: 12, scale: 2 }),

  // Card / gateway
  paymentReference: varchar("payment_reference", { length: 255 }),  // card transaction ref

  // Cashfree-specific
  cashfreeOrderId:     varchar("cashfree_order_id",     { length: 100 }),
  paymentSessionId:    varchar("payment_session_id",    { length: 255 }),
  idempotencyKey:      varchar("idempotency_key",       { length: 100 }),

  status:           paymentStatusEnum("status").notNull().default("PENDING"),

  failureReason:    text("failure_reason"),                          // set on FAILED / CANCELLED
  paidAt:           timestamp("paid_at", { withTimezone: true }),

  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// ─── payment_webhook_events ───────────────────────────────────────────────────
// Idempotency store for incoming Cashfree webhooks.
// A webhook_id is processed exactly once — duplicates are silently ignored.

export const paymentWebhookEvents = pgTable("payment_webhook_events", {
  id:            bigserial("id", { mode: "bigint" }).primaryKey(),

  webhookId:     varchar("webhook_id", { length: 255 }).notNull().unique(), // Cashfree cf_payment_id / event id
  transactionId: bigint("transaction_id", { mode: "bigint" })
                   .references(() => paymentTransactions.id, { onDelete: "set null" }),

  eventType:     varchar("event_type", { length: 100 }).notNull(),  // e.g. "PAYMENT_SUCCESS"
  rawPayload:    text("raw_payload").notNull(),                      // full JSON for audit

  processedAt:   timestamp("processed_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// ─── payments (legacy / receipts payments table — kept for receipt linking) ───

export const payments = pgTable("payments", {
  id:               bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:         uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  orderId:          bigint("order_id", { mode: "bigint" })
                      .notNull()
                      .references(() => orders.id, { onDelete: "restrict" }),

  methodId:         bigint("method_id", { mode: "bigint" })
                      .notNull()
                      .references(() => paymentMethods.id, { onDelete: "restrict" }),

  transactionId:    bigint("transaction_id", { mode: "bigint" })
                      .references(() => paymentTransactions.id, { onDelete: "restrict" }),

  amount:           numeric("amount", { precision: 12, scale: 2 }).notNull(),
  changeAmount:     numeric("change_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),

  transactionRef:   varchar("transaction_ref", { length: 255 }),
  gatewayResponse:  text("gateway_response"),

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

  receiptData:    text("receipt_data"),                              // JSON snapshot for reprint

  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});
