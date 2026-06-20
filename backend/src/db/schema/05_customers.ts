import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── customers ────────────────────────────────────────────────────────────────

export const customers = pgTable("customers", {
  id:        bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:  uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  name:      varchar("name", { length: 100 }).notNull(),
  email:     varchar("email", { length: 255 }),
  phone:     varchar("phone", { length: 20 }),

  // Soft delete
  deletedAt: timestamp("deleted_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});
