-- ============================================================================
-- SEED: nutrition_diagnosis_lookup
-- ============================================================================
-- Ensures all 7 review categories (CARB, PROTEIN, FAT, FIBRE, IRON, CALCIUM,
-- MICRO) each have exactly 4 standard options.
--
-- Safe to re-run: uses INSERT ... WHERE NOT EXISTS (case-insensitive check).
-- ============================================================================

INSERT INTO consultation.nutrition_diagnosis_lookup (id, category, diagnosis, is_active)
SELECT gen_random_uuid(), v.category, v.diagnosis, true
FROM (VALUES
  -- CARB
  ('CARB',    'Adequate intake of carbohydrates'),
  ('CARB',    'Insufficient intake of carbohydrates'),
  ('CARB',    'Excessive intake of carbohydrates'),
  ('CARB',    'Inconsistent intake of carbohydrates'),
  -- PROTEIN
  ('PROTEIN', 'Adequate intake of protein'),
  ('PROTEIN', 'Insufficient intake of protein'),
  ('PROTEIN', 'Excessive intake of protein'),
  ('PROTEIN', 'Inconsistent intake of protein'),
  -- FAT
  ('FAT',     'Adequate intake of fat'),
  ('FAT',     'Insufficient intake of fat'),
  ('FAT',     'Excessive intake of fat'),
  ('FAT',     'Inconsistent intake of fat'),
  -- FIBRE
  ('FIBRE',   'Adequate intake of fibre'),
  ('FIBRE',   'Insufficient intake of fibre'),
  ('FIBRE',   'Excessive intake of fibre'),
  ('FIBRE',   'Inconsistent intake of fibre'),
  -- IRON
  ('IRON',    'Adequate intake of iron'),
  ('IRON',    'Insufficient intake of iron'),
  ('IRON',    'Excessive intake of iron'),
  ('IRON',    'Inconsistent intake of iron'),
  -- CALCIUM
  ('CALCIUM', 'Adequate intake of calcium'),
  ('CALCIUM', 'Insufficient intake of calcium'),
  ('CALCIUM', 'Excessive intake of calcium'),
  ('CALCIUM', 'Inconsistent intake of calcium'),
  -- MICRO
  ('MICRO',   'Adequate intake of micronutrients'),
  ('MICRO',   'Insufficient intake of micronutrients'),
  ('MICRO',   'Excessive intake of micronutrients'),
  ('MICRO',   'Inconsistent intake of micronutrients')
) AS v(category, diagnosis)
WHERE NOT EXISTS (
  SELECT 1
  FROM consultation.nutrition_diagnosis_lookup
  WHERE category    = v.category
    AND LOWER(diagnosis) = LOWER(v.diagnosis)
);

-- Verify: all 7 standard categories should now show 4 (plus any legacy rows)
SELECT category, COUNT(*) AS option_count
FROM consultation.nutrition_diagnosis_lookup
WHERE is_active = true
GROUP BY category
ORDER BY category;
