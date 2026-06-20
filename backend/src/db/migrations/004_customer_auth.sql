-- =============================================================================
-- CAFE POS — Migration 004: Customer auth fields
-- Adds password_hash + loyalty_points to customers so they can register/login.
-- Safe to re-run (all statements are idempotent).
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE customers ADD COLUMN password_hash TEXT;
  END IF;
END;
$$;

-- Optional: track total loyalty points (future feature hook)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'loyalty_points'
  ) THEN
    ALTER TABLE customers ADD COLUMN loyalty_points INT NOT NULL DEFAULT 0;
  END IF;
END;
$$;

-- email is now required for auth — add a sparse index for fast lookup
CREATE INDEX IF NOT EXISTS idx_customers_email_auth
  ON customers (email) WHERE email IS NOT NULL AND password_hash IS NOT NULL;
