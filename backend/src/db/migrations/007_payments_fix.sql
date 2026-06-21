-- =============================================================================
-- CAFE POS — Migration 007: Fix payments table missing columns
-- Adds transaction_id and fixes status column type.
-- Safe to re-run (all statements are idempotent).
-- =============================================================================

-- ─── 1. Add transaction_id to payments ───────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'transaction_id'
  ) THEN
    ALTER TABLE payments
      ADD COLUMN transaction_id BIGINT
        REFERENCES payment_transactions(id) ON DELETE RESTRICT;
  END IF;
END;
$$;

-- ─── 2. Normalise any non-standard status values before casting ───────────────
-- "COMPLETED" was used by old code — map it to "SUCCESS"
UPDATE payments SET status = 'SUCCESS' WHERE status = 'COMPLETED';
-- Any other unknowns fall back to PENDING
UPDATE payments SET status = 'PENDING'
  WHERE status NOT IN ('PENDING','SUCCESS','FAILED','CANCELLED','EXPIRED','REFUNDED');

-- ─── 3. Fix payments.status to use payment_status enum ───────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments'
      AND column_name = 'status'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE payments
      ALTER COLUMN status TYPE payment_status
        USING status::payment_status,
      ALTER COLUMN status SET DEFAULT 'PENDING'::payment_status;
  END IF;
END;
$$;

-- ─── 4. Index for the new FK ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments (transaction_id);
