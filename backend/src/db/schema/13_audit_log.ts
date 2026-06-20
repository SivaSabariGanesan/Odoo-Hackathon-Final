import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  text,
  bigint,
  inet,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const auditActionEnum = pgEnum("audit_action", [
  "CREATE",
  "UPDATE",
  "DELETE",
  "ARCHIVE",
  "LOGIN",
  "LOGOUT",
  "PASSWORD_RESET",
  "SESSION_OPEN",
  "SESSION_CLOSE",
  "PAYMENT",
  "REFUND",
  "CANCEL",
]);

// ─── audit_logs ───────────────────────────────────────────────────────────────
/**
 * Append-only audit trail.
 * Never update or delete rows in this table.
 * actorId references staff_accounts.id (nullable for system/anonymous actions).
 */
export const auditLogs = pgTable("audit_logs", {
  id:           bigserial("id", { mode: "bigint" }).primaryKey(),
  publicId:     uuid("public_id").notNull().unique().default(sql`gen_random_uuid()`),

  actorId:      bigint("actor_id", { mode: "bigint" }),              // staff_accounts.id

  action:       auditActionEnum("action").notNull(),
  entityType:   varchar("entity_type", { length: 50 }).notNull(),    // e.g. "order", "product"
  entityId:     bigint("entity_id", { mode: "bigint" }),             // internal id of affected row

  // JSON snapshots for before/after diffing
  oldValue:     text("old_value"),                                    // JSON string
  newValue:     text("new_value"),                                    // JSON string

  description:  text("description"),                                  // human-readable summary
  ipAddress:    inet("ip_address"),
  userAgent:    text("user_agent"),

  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});
