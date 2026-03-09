-- Migration: Add batch_unit column to SSS.Inventory_Batch
-- Purpose: Store the unit of measurement for inventory batches (e.g., 'bottles', 'capsules', 'servings')
-- Date: 2026-03-09
-- Run with:
--   PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f Backend/migrations/add_batch_unit_column.sql

ALTER TABLE SSS.Inventory_Batch
ADD COLUMN IF NOT EXISTS batch_unit VARCHAR(50);

COMMENT ON COLUMN SSS.Inventory_Batch.batch_unit IS
  'Unit of measurement for the inventory batch (e.g., bottles, capsules, servings, grams, etc.)';