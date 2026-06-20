import {
  pgTable,
  bigserial,
  bigint,
  uuid,
  varchar,
  text,
  boolean,
  numeric,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const promotionTypeEnum = pgEnum("promotion_type", [
  "COUPON_PERCENTAGE",
  "COUPON_FIXED",
  "AUTO_PRODUCT_QTY",   // triggered when N units of a product are ordered
  "AUTO_ORDER_AMOUNT",  // triggered when order total >= threshold
]);

export const promotionStatusEnum = pgEnum("promotion_status", [
  "ACTIVE",
  "INACTIVE",
  "EXPIRED",
]);

// ─── promotions ───────────────────────────────────────────────────────────────

export const promotions = pgTable("promotions", {
  id:          bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:    uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  name:        varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  type:        promotionTypeEnum("type").notNull(),
  status:      promotionStatusEnum("status").notNull().default("ACTIVE"),

  // Coupon-specific
  couponCode:  varchar("coupon_code", { length: 50 }).unique(),

  // Discount value — percentage (0–100) or fixed monetary amount
  discountValue: numeric("discount_value", { precision: 12, scale: 2 }).notNull(),

  // Auto-trigger thresholds
  minOrderAmount:  numeric("min_order_amount", { precision: 12, scale: 2 }),  // AUTO_ORDER_AMOUNT
  triggerProductId: bigint("trigger_product_id", { mode: "bigint" }),      // AUTO_PRODUCT_QTY
  triggerQty:       integer("trigger_qty"),                                    // AUTO_PRODUCT_QTY

  // Usage limits
  maxUses:     integer("max_uses"),          // null = unlimited
  usedCount:   integer("used_count").notNull().default(0),

  // Validity window
  startsAt:    timestamp("starts_at", { withTimezone: true }),
  expiresAt:   timestamp("expires_at", { withTimezone: true }),

  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});
