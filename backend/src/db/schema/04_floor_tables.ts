import {
  pgTable,
  bigserial,
  bigint,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── floors ───────────────────────────────────────────────────────────────────

export const floors = pgTable("floors", {
  id:        bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:  uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  name:      varchar("name", { length: 100 }).notNull(),             // e.g. "Ground Floor"
  sortOrder: integer("sort_order").notNull().default(0),
  isActive:  boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// ─── floor_tables ─────────────────────────────────────────────────────────────
// NOTE: Occupancy is derived at query time from the existence of a DRAFT order
//       for this table (see floor.service.ts:getOccupiedTableIds). There is no
//       stored state column — that was removed to eliminate the dual-write bug
//       where floor_tables.state and the orders table could disagree.

export const floorTables = pgTable("floor_tables", {
  id:          bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:    uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  floorId:     bigint("floor_id", { mode: "bigint" })
                 .notNull()
                 .references(() => floors.id, { onDelete: "cascade" }),

  tableNumber: varchar("table_number", { length: 20 }).notNull(),   // e.g. "T-01"
  seats:       integer("seats").notNull().default(4),

  // QR self-ordering token — stable per table, embedded directly in printed QR.
  // Do NOT rotate this without also reprinting the QR codes.
  qrToken:     uuid("qr_token").notNull().unique().default(sql`gen_random_uuid()`),

  isActive:    boolean("is_active").notNull().default(true),
  posX:        integer("pos_x").default(0),                          // optional floor-plan coordinates
  posY:        integer("pos_y").default(0),

  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});
