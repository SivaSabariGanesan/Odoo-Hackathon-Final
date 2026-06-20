// ─── Role ─────────────────────────────────────────────────────────────────────

export type Role = "ADMIN" | "CASHIER" | "KITCHEN";

// ─── JWT Payload ──────────────────────────────────────────────────────────────
// Permissions are NOT stored in JWT — derived from role at runtime.

export interface JwtPayload {
  sub:   string;   // staff_accounts.public_id (UUID)
  email: string;
  role:  Role;
  iat?:  number;
  exp?:  number;
}

// ─── Request context ──────────────────────────────────────────────────────────

export interface AuthUser {
  id:       bigint;   // internal PK (for DB joins)
  publicId: string;   // UUID exposed to client
  email:    string;
  name:     string;
  role:     Role;
  status:   string;
}

// ─── Permission matrix ────────────────────────────────────────────────────────

export type Permission =
  | "products:read"    | "products:write"
  | "categories:read"  | "categories:write"
  | "tables:read"      | "tables:write"
  | "floors:read"      | "floors:write"
  | "orders:read"      | "orders:write"    | "orders:cancel"
  | "customers:read"   | "customers:write"
  | "pos:access"       | "pos:session"
  | "kds:read"         | "kds:write"
  | "display:read"     | "display:write"
  | "payments:read"    | "payments:write"
  | "promotions:read"  | "promotions:write"
  | "reports:read"
  | "staff:read"       | "staff:write"
  | "self_order:read"  | "self_order:write";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    "products:read",    "products:write",
    "categories:read",  "categories:write",
    "tables:read",      "tables:write",
    "floors:read",      "floors:write",
    "orders:read",      "orders:write",    "orders:cancel",
    "customers:read",   "customers:write",
    "pos:access",       "pos:session",
    "kds:read",         "kds:write",
    "display:read",     "display:write",
    "payments:read",    "payments:write",
    "promotions:read",  "promotions:write",
    "reports:read",
    "staff:read",       "staff:write",
    "self_order:read",  "self_order:write",
  ],
  CASHIER: [
    "products:read",
    "categories:read",
    "tables:read",      "tables:write",
    "floors:read",
    "orders:read",      "orders:write",    "orders:cancel",
    "customers:read",   "customers:write",
    "pos:access",       "pos:session",
    "kds:read",
    "display:read",
    "payments:read",    "payments:write",
    "promotions:read",
    "self_order:read",
  ],
  KITCHEN: [
    "kds:read",         "kds:write",
    "orders:read",
    "products:read",
    "categories:read",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
