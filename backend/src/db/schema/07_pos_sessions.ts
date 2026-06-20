import {
  pgTable,
  bigserial,
  bigint,
  uuid,
  numeric,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { staffAccounts } from "./01_staff.ts";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const sessionStatusEnum = pgEnum("session_status", ["OPEN", "CLOSED"]);

// ─── pos_sessions ─────────────────────────────────────────────────────────────

export const posSessions = pgTable("pos_sessions", {
  id:           bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:     uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  openedById:   bigint("opened_by_id", { mode: "bigint" })
                  .notNull()
                  .references(() => staffAccounts.id, { onDelete: "restrict" }),

  closedById:   bigint("closed_by_id", { mode: "bigint" })
                  .references(() => staffAccounts.id, { onDelete: "restrict" }),

  status:       sessionStatusEnum("status").notNull().default("OPEN"),

  // Cash tracking
  openingCash:  numeric("opening_cash", { precision: 12, scale: 2 }).notNull().default("0.00"),
  closingCash:  numeric("closing_cash", { precision: 12, scale: 2 }),   // declared by cashier
  actualCash:   numeric("actual_cash", { precision: 12, scale: 2 }),    // system calculated

  notes:        text("notes"),

  openedAt:     timestamp("opened_at", { withTimezone: true }).notNull().default(sql`now()`),
  closedAt:     timestamp("closed_at", { withTimezone: true }),

  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});
