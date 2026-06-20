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

export const taxTypeEnum = pgEnum("tax_type", ["NONE", "INCLUSIVE", "EXCLUSIVE"]);

export const uomEnum = pgEnum("uom", ["PIECE", "CUP", "GLASS", "PLATE", "BOWL", "KG", "GRAM", "LITRE", "ML"]);

// ─── product_categories ───────────────────────────────────────────────────────

export const productCategories = pgTable("product_categories", {
  id:        bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:  uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  name:      varchar("name", { length: 100 }).notNull().unique(),
  color:     varchar("color", { length: 7 }).notNull().default("#6366f1"), // hex color
  sortOrder: integer("sort_order").notNull().default(0),
  isActive:  boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// ─── products ─────────────────────────────────────────────────────────────────

export const products = pgTable("products", {
  id:          bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:    uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  categoryId:  bigint("category_id", { mode: "bigint" })
                 .notNull()
                 .references(() => productCategories.id, { onDelete: "restrict" }),

  name:        varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  imageUrl:    text("image_url"),

  price:       numeric("price", { precision: 12, scale: 2 }).notNull(),
  uom:         uomEnum("uom").notNull().default("PIECE"),

  // Tax
  taxType:     taxTypeEnum("tax_type").notNull().default("NONE"),
  taxRate:     numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0.00"),

  // Flags
  // Flags
isAvailable:    boolean("is_available").notNull().default(true),
sendToKitchen:  boolean("send_to_kitchen").notNull().default(true),

// Controls whether this product appears in Kitchen Display System.
// Example:
// Coffee -> true
// Bottled Water -> false
kdsVisible:     boolean("kds_visible").notNull().default(true),

isFeatured:     boolean("is_featured").notNull().default(false),

  sortOrder:   integer("sort_order").notNull().default(0),

  // Soft delete
  deletedAt:   timestamp("deleted_at", { withTimezone: true }),

  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});
