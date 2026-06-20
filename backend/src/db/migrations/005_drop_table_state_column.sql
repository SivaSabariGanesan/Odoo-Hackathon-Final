-- =============================================================================
-- CAFE POS — Migration 005: Remove floor_tables.state column
-- Occupancy is now derived from active orders.
-- This migration is idempotent and safe to run multiple times.
-- =============================================================================

BEGIN;

-- Drop the index that references the state column
DROP INDEX IF EXISTS idx_floor_tables_state;

-- Drop the column if it exists
ALTER TABLE floor_tables
DROP COLUMN IF EXISTS state;

-- Drop the enum type if it exists and is no longer referenced
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'table_state'
  ) THEN
    DROP TYPE table_state;
  END IF;
EXCEPTION
  WHEN dependent_objects_still_exist THEN
    -- Another object still uses this enum; leave it untouched
    NULL;
END;
$$;

COMMIT;