import {
  pgTable,
  bigserial,
  bigint,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const staffRoleEnum = pgEnum("staff_role", ["ADMIN", "CASHIER", "KITCHEN"]);

export const staffStatusEnum = pgEnum("staff_status", ["ACTIVE", "INACTIVE", "ARCHIVED"]);

// ─── staff_accounts ───────────────────────────────────────────────────────────

export const staffAccounts = pgTable("staff_accounts", {
  id:           bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:     uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  name:         varchar("name", { length: 100 }).notNull(),
  email:        varchar("email", { length: 255 }).notNull().unique(),
  phone:        varchar("phone", { length: 20 }),
  passwordHash: text("password_hash").notNull(),
  avatarUrl:    text("avatar_url"),
  pin:          varchar("pin", { length: 6 }),

  role:         staffRoleEnum("role").notNull().default("CASHIER"),
  status:       staffStatusEnum("status").notNull().default("ACTIVE"),

  lastLoginAt:  timestamp("last_login_at", { withTimezone: true }),

  // Password reset (admin-initiated)
  resetToken:          text("reset_token"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at", { withTimezone: true }),

  archivedAt:   timestamp("archived_at", { withTimezone: true }),
  deletedAt:    timestamp("deleted_at", { withTimezone: true }),

  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// ─── refresh_tokens ───────────────────────────────────────────────────────────

export const refreshTokens = pgTable("refresh_tokens", {
  id:         bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:   uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  userId:     bigint("user_id", { mode: "bigint" })
                .notNull()
                .references(() => staffAccounts.id, { onDelete: "cascade" }),

  // Store hashed token — raw token only lives in the HTTP response
  tokenHash:  text("token_hash").notNull().unique(),

  // Device / session context for multi-device support
  userAgent:  text("user_agent"),
  ipAddress:  text("ip_address"),

  expiresAt:  timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt:  timestamp("revoked_at", { withTimezone: true }),

  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});
