-- =============================================================================
-- CAFE POS — Migration 006: Create / patch payment_transactions table
-- Creates the table if it doesn't exist, then adds any missing columns.
-- Safe to re-run (all statements are idempotent).
-- =============================================================================

-- ─── 1. Create payment_status enum if missing ─────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM (
      'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'
    );
  END IF;
END;
$$;

-- ─── 2. Create payment_transactions table if missing ──────────────────────────
CREATE TABLE IF NOT EXISTS payment_transactions (
  id                 BIGSERIAL PRIMARY KEY,
  public_id          UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  order_id           BIGINT      NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  method_id          BIGINT      NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
  amount             NUMERIC(12,2) NOT NULL,
  received_amount    NUMERIC(12,2),
  change_amount      NUMERIC(12,2),
  payment_reference  VARCHAR(255),
  cashfree_order_id  VARCHAR(100),
  payment_session_id VARCHAR(255),
  idempotency_key    VARCHAR(100),
  status             payment_status NOT NULL DEFAULT 'PENDING',
  failure_reason     TEXT,
  paid_at            TIMESTAMP WITH TIME ZONE,
  created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ─── 3. Add any columns that may be missing from older table versions ─────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'received_amount') THEN
    ALTER TABLE payment_transactions ADD COLUMN received_amount NUMERIC(12,2);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'change_amount') THEN
    ALTER TABLE payment_transactions ADD COLUMN change_amount NUMERIC(12,2);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'payment_reference') THEN
    ALTER TABLE payment_transactions ADD COLUMN payment_reference VARCHAR(255);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'cashfree_order_id') THEN
    ALTER TABLE payment_transactions ADD COLUMN cashfree_order_id VARCHAR(100);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'payment_session_id') THEN
    ALTER TABLE payment_transactions ADD COLUMN payment_session_id VARCHAR(255);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'idempotency_key') THEN
    ALTER TABLE payment_transactions ADD COLUMN idempotency_key VARCHAR(100);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'failure_reason') THEN
    ALTER TABLE payment_transactions ADD COLUMN failure_reason TEXT;
  END IF;
END;
$$;

-- ─── 4. Create payment_provider_configs table if missing ──────────────────────
CREATE TABLE IF NOT EXISTS payment_provider_configs (
  id              BIGSERIAL PRIMARY KEY,
  public_id       UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  provider_name   VARCHAR(50) NOT NULL UNIQUE,
  client_id       TEXT,
  client_secret   TEXT,
  webhook_secret  TEXT,
  environment     VARCHAR(20) NOT NULL DEFAULT 'SANDBOX',
  is_enabled      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ─── 5. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payment_txn_order_id  ON payment_transactions (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_txn_status    ON payment_transactions (status);
CREATE INDEX IF NOT EXISTS idx_payment_txn_public_id ON payment_transactions (public_id);
