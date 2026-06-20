-- =============================================================================
-- CAFE POS — Giri's additive columns (Core POS Business Logic)
-- Run AFTER 001_indexes_and_constraints.sql
-- Safe to re-run via the IF NOT EXISTS / DO $$ pattern.
-- =============================================================================

-- ─── products.kds_visible ────────────────────────────────────────────────────
-- Only products with kds_visible = TRUE are surfaced on the Kitchen Display.
-- Defaults TRUE so existing products are not silently hidden.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'kds_visible'
  ) THEN
    ALTER TABLE products
      ADD COLUMN kds_visible BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_products_kds_visible
  ON products (kds_visible) WHERE kds_visible = TRUE;

-- ─── pos_sessions.closing_sale_amount ────────────────────────────────────────
-- Stores the aggregated sum of grand_total across all Paid orders in the session.
-- Written by closeSession(); read by the POS landing screen.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pos_sessions' AND column_name = 'closing_sale_amount'
  ) THEN
    ALTER TABLE pos_sessions
      ADD COLUMN closing_sale_amount NUMERIC(12, 2);
  END IF;
END;
$$;

-- ─── order_items.promotion_discount_applied ──────────────────────────────────
-- Display-only attribution: which item triggered the promotion.
-- This is NEVER a second deduction — discount lives in orders.discount_amount.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'promotion_discount_applied'
  ) THEN
    ALTER TABLE order_items
      ADD COLUMN promotion_discount_applied NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
  END IF;
END;
$$;

-- ─── KDS ticket order-level stage decision ────────────────────────────────────
-- Decision: NO separate stored column for the order-level KDS stage.
-- Rationale: kitchen_tickets.status is derived from the aggregate of
-- kitchen_ticket_items.state:
--   all TO_COOK          → PENDING
--   any PREPARING        → IN_PROGRESS
--   all COMPLETED        → COMPLETED
-- This is computed live in the KDS service query and kept consistent by
-- the transaction that updates individual item states.
-- A stored column would require a trigger to stay in sync — unnecessary here.
