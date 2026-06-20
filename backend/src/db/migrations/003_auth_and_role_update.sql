-- =============================================================================
-- CAFE POS — Migration 003: Auth tables + staff_role KITCHEN value
-- Safe to re-run (all statements are idempotent).
-- =============================================================================

-- ─── 1. Add KITCHEN to staff_role enum (if not already present) ──────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'staff_role'::regtype
      AND enumlabel = 'KITCHEN'
  ) THEN
    ALTER TYPE staff_role ADD VALUE 'KITCHEN';
  END IF;
END;
$$;

-- ─── 2. Optionally migrate MANAGER → ADMIN ───────────────────────────────────
-- MANAGER is no longer in the application enum. Update any existing MANAGER
-- rows to ADMIN so the app code never sees an unknown role.
-- Safe because MANAGER rows are admin-level staff.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'staff_role'::regtype
      AND enumlabel = 'MANAGER'
  ) THEN
    UPDATE staff_accounts SET role = 'ADMIN' WHERE role::text = 'MANAGER';
  END IF;
END;
$$;

-- ─── 3. Add last_login_at to staff_accounts (if not present) ────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_accounts' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE staff_accounts
      ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;
  END IF;
END;
$$;

-- ─── 4. Create refresh_tokens table (if not present) ────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          BIGSERIAL PRIMARY KEY,
  public_id   UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  user_id     BIGINT      NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,
  user_agent  TEXT,
  ip_address  TEXT,
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at  TIMESTAMP WITH TIME ZONE,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ─── 5. Indexes for refresh_tokens ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id   ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
