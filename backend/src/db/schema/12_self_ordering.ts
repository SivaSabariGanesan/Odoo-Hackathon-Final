import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── self_ordering_settings ───────────────────────────────────────────────────
/**
 * Singleton-style config table (one active row per outlet).
 * Future multi-outlet support: add outlet_id FK.
 */
export const selfOrderingSettings = pgTable("self_ordering_settings", {
  id:                   bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:             uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  // Feature toggles
  isEnabled:            boolean("is_enabled").notNull().default(false),
  onlineOrderingEnabled: boolean("online_ordering_enabled").notNull().default(false),
  qrMenuEnabled:        boolean("qr_menu_enabled").notNull().default(true),

  // Branding
  brandName:            varchar("brand_name", { length: 100 }),
  logoUrl:              text("logo_url"),
  bgColor:              varchar("bg_color", { length: 7 }).notNull().default("#ffffff"),
  bgImageUrl:           text("bg_image_url"),
  accentColor:          varchar("accent_color", { length: 7 }).notNull().default("#6366f1"),

  // Welcome message shown on QR landing page
  welcomeMessage:       text("welcome_message"),

  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});
