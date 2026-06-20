import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const staffRoleEnum = pgEnum("staff_role", ["ADMIN", "CASHIER", "MANAGER"]);

export const staffStatusEnum = pgEnum("staff_status", ["ACTIVE", "INACTIVE", "ARCHIVED"]);

// ─── Table ────────────────────────────────────────────────────────────────────

/**
 * staff_accounts
 * Unified table for admin users and POS employees/cashiers.
 * UUIDv4 (public_id) is exposed to external APIs; internal bigserial id is used for FK joins.
 */
export const staffAccounts = pgTable("staff_accounts", {
  id:           bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:     uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  // Identity
  name:         varchar("name", { length: 100 }).notNull(),
  email:        varchar("email", { length: 255 }).notNull().unique(),
  phone:        varchar("phone", { length: 20 }),
  passwordHash: text("password_hash").notNull(),
  avatarUrl:    text("avatar_url"),
  pin:          varchar("pin", { length: 6 }), // optional 6-digit POS PIN

  // Role & Status
  role:         staffRoleEnum("role").notNull().default("CASHIER"),
  status:       staffStatusEnum("status").notNull().default("ACTIVE"),

  // Password reset
  resetToken:           text("reset_token"),
  resetTokenExpiresAt:  timestamp("reset_token_expires_at", { withTimezone: true }),

  // Soft delete / archive
  archivedAt:   timestamp("archived_at", { withTimezone: true }),
  deletedAt:    timestamp("deleted_at", { withTimezone: true }),

  // Audit
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});
