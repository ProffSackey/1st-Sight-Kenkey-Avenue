-- Adds creator tracking to items so admin table can show "Item Added By".
-- Safe to run multiple times.

ALTER TABLE items
ADD COLUMN IF NOT EXISTS created_by UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_items_created_by'
  ) THEN
    ALTER TABLE items
    ADD CONSTRAINT fk_items_created_by
    FOREIGN KEY (created_by)
    REFERENCES employees(id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_items_created_by ON items(created_by);
