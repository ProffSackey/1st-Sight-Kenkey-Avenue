-- Best-effort backfill for existing items.
-- Uses earliest stock movement `recorded_by` for each item when available.

WITH first_movement AS (
  SELECT DISTINCT ON (sm.item_id)
    sm.item_id,
    sm.recorded_by
  FROM stock_movements sm
  WHERE sm.recorded_by IS NOT NULL
  ORDER BY sm.item_id, sm.created_at ASC
)
UPDATE items i
SET created_by = fm.recorded_by
FROM first_movement fm
WHERE i.id = fm.item_id
  AND i.created_by IS NULL;
