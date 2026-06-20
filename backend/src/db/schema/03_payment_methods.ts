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

export const paymentMethodTypeEnum = pgEnum("payment_method_type", [
  "CASH",
  "CARD",
  "CASHFREE",
]);

export const providerEnvironmentEnum = pgEnum("provider_environment", [
  "SANDBOX",
  "PRODUCTION",
]);

// ─── payment_methods ──────────────────────────────────────────────────────────

export const paymentMethods = pgTable("payment_methods", {
  id:        bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:  uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  name:      varchar("name", { length: 100 }).notNull().unique(),
  type:      paymentMethodTypeEnum("type").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// ─── payment_provider_configs ─────────────────────────────────────────────────
// Stores encrypted Cashfree credentials — secrets never leave the backend.

export const paymentProviderConfigs = pgTable("payment_provider_configs", {
  id:            bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:      uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  providerName:  varchar("provider_name", { length: 50 }).notNull().unique(), // e.g. "CASHFREE"

  // AES-256-GCM encrypted: "<iv>:<authTag>:<ciphertext>" stored as text
  clientId:      text("client_id"),
  clientSecret:  text("client_secret"),
  webhookSecret: text("webhook_secret"),

  environment:   providerEnvironmentEnum("environment").notNull().default("SANDBOX"),
  isEnabled:     boolean("is_enabled").notNull().default(false),

  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});
