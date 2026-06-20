import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const paymentMethodTypeEnum = pgEnum("payment_method_type", [
  "CASH",
  "CARD",
  "UPI_QR",
  "DIGITAL_WALLET",
]);

// ─── payment_methods ──────────────────────────────────────────────────────────

export const paymentMethods = pgTable("payment_methods", {
  id:         bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:   uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  name:       varchar("name", { length: 100 }).notNull(),           // e.g. "Cash", "PhonePe UPI"
  type:       paymentMethodTypeEnum("type").notNull(),

  // UPI-specific
  upiId:      varchar("upi_id", { length: 100 }),                   // e.g. merchant@upi
  upiQrUrl:   text("upi_qr_url"),                                    // pre-generated QR image URL

  isEnabled:  boolean("is_enabled").notNull().default(true),
  sortOrder:  integer("sort_order").notNull().default(0),

  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:  timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});
