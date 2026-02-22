-- ============================================================================
-- POPULATE TEST SESSION DATA
-- Session ID: 019c81ea-062b-7a88-b848-c5a41cc1874d
-- ============================================================================
-- Run this script to populate sample data for the test session so that the
-- frontend adherences, meal log, and medical history components display real
-- data instead of empty/null values.
--
-- NOTE: Tables use `id` as primary key; sessions_id is a regular FK (no unique
-- constraint). This script uses UPDATE + conditional INSERT for idempotency.
-- ============================================================================

-- ============================================================================
-- 1. SESSION NUTRITION REVIEW (Adherences + Anthropometry inputs)
-- ============================================================================
-- Update the existing record (PAL=1.90 was already set)
UPDATE consultation.session_nutrition_review
SET
    anthropometry_height_cm                    = 181.0,
    anthropometry_weight_kg                    = 70.0,
    anthropometry_target_weight_kg             = 65.0,
    anthropometry_fat_mass_kg                  = 15.2,
    anthropometry_skeletal_muscle_mass_kg      = 33.5,
    training_physical_activity_level_pal       = 1.90,
    estimated_carbohydrate_intake_g            = 350.0,
    estimated_protein_intake_g                 = 140.0,
    estimated_fat_intake_g                     = 60.0,
    minimum_carbohydrate_requirment_g_kg_bw    = 5.0,
    maximum_carbohydrate_requirment_g_kg_bw    = 8.0,
    minimum_protein_requirment_g_kg_bw         = 1.6,
    maximum_protein_requirment_g_kg_bw         = 2.2,
    minimum_fat_requirment_g_kg_bw             = 1.0,
    maximum_fat_requirment_g_kg_bw             = 1.5,
    comments_on_weekday_intake                 = 'Generally consistent with plan on weekdays. Pre-training fuelling needs improvement.',
    comments_on_weekend_intake                 = 'Tends to eat more carbohydrates on weekends due to longer training sessions.',
    other_remarks                              = 'Good overall dietary adherence. Focus on post-training recovery nutrition timing.'
WHERE sessions_id = '019c81ea-062b-7a88-b848-c5a41cc1874d';

-- Insert only if no record exists yet
INSERT INTO consultation.session_nutrition_review (
    sessions_id,
    anthropometry_height_cm,
    anthropometry_weight_kg,
    anthropometry_target_weight_kg,
    anthropometry_fat_mass_kg,
    anthropometry_skeletal_muscle_mass_kg,
    training_physical_activity_level_pal,
    estimated_carbohydrate_intake_g,
    estimated_protein_intake_g,
    estimated_fat_intake_g,
    minimum_carbohydrate_requirment_g_kg_bw,
    maximum_carbohydrate_requirment_g_kg_bw,
    minimum_protein_requirment_g_kg_bw,
    maximum_protein_requirment_g_kg_bw,
    minimum_fat_requirment_g_kg_bw,
    maximum_fat_requirment_g_kg_bw,
    comments_on_weekday_intake,
    comments_on_weekend_intake,
    other_remarks
)
SELECT
    '019c81ea-062b-7a88-b848-c5a41cc1874d',
    181.0, 70.0, 65.0, 15.2, 33.5, 1.90,
    350.0, 140.0, 60.0,
    5.0, 8.0, 1.6, 2.2, 1.0, 1.5,
    'Generally consistent with plan on weekdays. Pre-training fuelling needs improvement.',
    'Tends to eat more carbohydrates on weekends due to longer training sessions.',
    'Good overall dietary adherence. Focus on post-training recovery nutrition timing.'
WHERE NOT EXISTS (
    SELECT 1 FROM consultation.session_nutrition_review
    WHERE sessions_id = '019c81ea-062b-7a88-b848-c5a41cc1874d'
);

-- ============================================================================
-- 2. SESSION ANTHROPOMETRY (sum of skinfolds, parents heights)
-- ============================================================================
DELETE FROM consultation.session_anthropometry
WHERE sessions_id = '019c81ea-062b-7a88-b848-c5a41cc1874d';

INSERT INTO consultation.session_anthropometry (
    sessions_id,
    bmi_category,
    sum_of_8_skinfold,
    mother_height,
    father_height,
    other_remarks
) VALUES (
    '019c81ea-062b-7a88-b848-c5a41cc1874d',
    'Normal',
    58.4,
    163.0,
    178.0,
    'Measurements taken post morning training, well hydrated.'
);

-- ============================================================================
-- 3. SESSION MEAL LOG
-- ============================================================================
DELETE FROM consultation.session_meal_log
WHERE sessions_id = '019c81ea-062b-7a88-b848-c5a41cc1874d';

INSERT INTO consultation.session_meal_log (
    sessions_id,
    am_breakfast_food,      am_breakfast_macro,
    am_training_food,       am_training_macro,
    pm_lunch_food,          pm_lunch_macro,
    pm_training_food,       pm_training_macro,
    pm_dinner_food,         pm_dinner_macro,
    supper_food,            supper_macro,
    total_carbohydrate_intake,
    total_protein_intake,
    total_fat_intake,
    other_remarks
) VALUES (
    '019c81ea-062b-7a88-b848-c5a41cc1874d',
    'Oatmeal with banana and milk',             'CHO: 70g, PRO: 15g, FAT: 8g',
    'Sports drink + energy gel',                'CHO: 45g, PRO: 0g, FAT: 0g',
    'Rice with grilled chicken and vegetables', 'CHO: 80g, PRO: 40g, FAT: 10g',
    'Protein shake with banana',                'CHO: 35g, PRO: 30g, FAT: 3g',
    'Pasta with lean beef mince and salad',     'CHO: 90g, PRO: 40g, FAT: 12g',
    'Greek yogurt with mixed nuts',             'CHO: 20g, PRO: 15g, FAT: 10g',
    340.0,
    140.0,
    43.0,
    'Athlete tracks intake on MyFitnessPal. Good meal timing around training sessions.'
);

-- ============================================================================
-- 4. SESSION PUBERTY
-- ============================================================================
DELETE FROM consultation.session_puberty
WHERE sessions_id = '019c81ea-062b-7a88-b848-c5a41cc1874d';

INSERT INTO consultation.session_puberty (
    sessions_id,
    period_of_growth_spurt,
    other_remarks
) VALUES (
    '019c81ea-062b-7a88-b848-c5a41cc1874d',
    'Growth spurt around age 14-15, approximately 3 years ago',
    'Growth phase completed. No current concerns related to pubertal development.'
);

-- ============================================================================
-- 5. SESSION BOWEL MOVEMENT
-- ============================================================================
DELETE FROM consultation.session_bowel_movement
WHERE sessions_id = '019c81ea-062b-7a88-b848-c5a41cc1874d';

INSERT INTO consultation.session_bowel_movement (
    sessions_id,
    regular_bowel_movement,
    frequency_of_bowel_movement,
    stool_visual,
    other_remarks
) VALUES (
    '019c81ea-062b-7a88-b848-c5a41cc1874d',
    true,
    'Once daily, usually in the morning',
    'Type 3-4 on Bristol stool chart',
    'No digestive issues reported. Regular pattern maintained consistently.'
);

-- ============================================================================
-- 6. SESSION HYDRATION
-- ============================================================================
DELETE FROM consultation.session_hydration
WHERE sessions_id = '019c81ea-062b-7a88-b848-c5a41cc1874d';

INSERT INTO consultation.session_hydration (
    sessions_id,
    water_intake_per_day,
    urine_colour,
    hydration_status,
    other_remarks
) VALUES (
    '019c81ea-062b-7a88-b848-c5a41cc1874d',
    3.2,
    'Pale yellow (2-3 on urine colour chart)',
    'Well hydrated',
    'Good hydration habits. Carries water bottle to all sessions. Uses electrolyte replacement during long training.'
);

-- ============================================================================
-- 7. SESSION PERIOD
-- ============================================================================
DELETE FROM consultation.session_period
WHERE sessions_id = '019c81ea-062b-7a88-b848-c5a41cc1874d';

INSERT INTO consultation.session_period (
    sessions_id,
    other_remarks
) VALUES (
    '019c81ea-062b-7a88-b848-c5a41cc1874d',
    'Not applicable — male athlete.'
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
SELECT 'NUTRITION REVIEW' AS check_type,
    anthropometry_height_cm,
    anthropometry_weight_kg,
    training_physical_activity_level_pal       AS pal,
    minimum_carbohydrate_requirment_g_kg_bw    AS min_carb_gkg,
    minimum_carbohydrate_requirment_g          AS min_carb_g,
    rmr_male_resting_metabolic_rate            AS rmr_male,
    tee_male_total_energy_expenditure          AS tee_male
FROM consultation.session_nutrition_review
WHERE sessions_id = '019c81ea-062b-7a88-b848-c5a41cc1874d';

SELECT 'MEAL LOG' AS check_type,
    am_breakfast_food,
    total_carbohydrate_intake,
    total_protein_intake,
    total_fat_intake
FROM consultation.session_meal_log
WHERE sessions_id = '019c81ea-062b-7a88-b848-c5a41cc1874d';
