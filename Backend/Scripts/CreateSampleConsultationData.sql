-- ============================================================================
-- COMPREHENSIVE SAMPLE CONSULTATION DATA FOR TESTING
-- ============================================================================
-- This script creates complete sample data for all consultation tables
-- linked to athlete ID: 019c8123-ce08-7cf6-823a-1e786ae9bc69

-- ============================================================================
-- BASIC SETUP DATA (Nutritionist, Sport, Athlete)
-- ============================================================================

-- Insert a sample nutritionist (if not exists)
INSERT INTO ams.nutritionist (id, name)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Dr. Sarah Wilson'
) ON CONFLICT (id) DO NOTHING;

-- Insert a sample sport (if not exists)
INSERT INTO ams.sport_lookup (id, sport)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Swimming'
) ON CONFLICT (id) DO NOTHING;

-- Insert a sample athlete
INSERT INTO ams.athlete (id, sport_id, sportsync_id, athlete_name_abbr, gender, date_of_birth)
VALUES (
    '019c8123-ce08-7cf6-823a-1e786ae9bc69',  -- Using the ID from your error
    '00000000-0000-0000-0000-000000000002',  -- sport_id
    'SW001',
    'Alex Chen',
    'MALE',
    '2005-03-20'
) ON CONFLICT (id) DO NOTHING;

-- Insert athlete registry
INSERT INTO ams.athlete_registry (athlete_id, carding_status, athlete_notified_on, carding_start_date, carding_end_date, medical_clearance, approved_start_date, approved_end_date)
VALUES (
    '019c8123-ce08-7cf6-823a-1e786ae9bc69',
    'Active',
    '2024-01-15',
    '2024-01-15',
    '2024-12-31',
    true,
    '2024-01-15',
    '2024-12-31'
) ON CONFLICT (athlete_id) DO NOTHING;

-- Insert athlete medical
INSERT INTO ams.athlete_medical (athlete_id, medical_condition, food_allergy, drug_allergy, past_injury, medical_remarks)
VALUES (
    '019c8123-ce08-7cf6-823a-1e786ae9bc69',
    'Mild asthma (exercise-induced)',
    'Shellfish allergy',
    'None known',
    'Right shoulder impingement (2023)',
    'Well-controlled asthma, competes regularly'
) ON CONFLICT (athlete_id) DO NOTHING;

-- ============================================================================
-- CONSULTATION LOOKUP TABLES
-- ============================================================================

-- Insert consultation type lookup
INSERT INTO consultation.type_of_consult_lookup (id, type_of_consult, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000003', 'Initial Assessment', true),
    ('00000000-0000-0000-0000-000000000013', 'Follow-up Review', true),
    ('00000000-0000-0000-0000-000000000023', 'Competition Prep', true)
ON CONFLICT (type_of_consult) DO NOTHING;

-- Insert nutrition diagnosis lookup
INSERT INTO consultation.nutrition_diagnosis_lookup (id, category, diagnosis, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000004', 'Energy Balance', 'Inadequate energy intake', true),
    ('00000000-0000-0000-0000-000000000014', 'Hydration', 'Suboptimal hydration', true),
    ('00000000-0000-0000-0000-000000000024', 'Macronutrients', 'Inadequate protein intake', true)
ON CONFLICT (category, diagnosis) DO NOTHING;

-- Insert open item status lookup
INSERT INTO consultation.open_item_status_lookup (id, open_item_status, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000005', 'Pending', true),
    ('00000000-0000-0000-0000-000000000015', 'In Progress', true),
    ('00000000-0000-0000-0000-000000000025', 'Completed', true)
ON CONFLICT (open_item_status) DO NOTHING;

-- ============================================================================
-- CONSULTATION SESSION & CORE DATA
-- ============================================================================

-- Insert a sample consultation session
INSERT INTO consultation.sessions (id, nutritionist_id, athlete_id, type_of_consult_id, date_of_consult, date_of_next_follow_up)
VALUES (
    '00000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000001',  -- nutritionist_id
    '019c8123-ce08-7cf6-823a-1e786ae9bc69',  -- athlete_id (the one from your error)
    '00000000-0000-0000-0000-000000000003',  -- type_of_consult_id
    '2024-02-22',
    '2024-03-08'
) ON CONFLICT (id) DO NOTHING;

-- Insert sample anthropometry data
INSERT INTO consultation.session_nutrition_review (sessions_id, anthropometry_height_cm, anthropometry_weight_kg, anthropometry_target_weight_kg, anthropometry_fat_mass_kg, anthropometry_skeletal_muscle_mass_kg, training_physical_activity_level_pal, estimated_carbohydrate_intake_g, estimated_protein_intake_g, estimated_fat_intake_g, minimum_carbohydrate_requirment_g_kg_bw, maximum_carbohydrate_requirment_g_kg_bw, minimum_protein_requirment_g_kg_bw, maximum_protein_requirment_g_kg_bw, minimum_fat_requirment_g_kg_bw, maximum_fat_requirment_g_kg_bw)
VALUES (
    '00000000-0000-0000-0000-000000000006',
    178.5,  -- height in cm
    72.3,   -- weight in kg
    74.0,   -- target weight
    8.2,    -- fat mass
    35.8,   -- skeletal muscle mass
    1.8,    -- PAL
    450.0,  -- estimated carb intake
    120.0,  -- estimated protein intake
    85.0,   -- estimated fat intake
    5.0,    -- min carb requirement
    8.0,    -- max carb requirement
    1.6,    -- min protein requirement
    2.2,    -- max protein requirement
    1.0,    -- min fat requirement
    1.5     -- max fat requirement
);

-- Insert sample session anthropometry
INSERT INTO consultation.session_anthropometry (sessions_id, bmi_category, sum_of_8_skinfold, mother_height, father_height, other_remarks)
VALUES (
    '00000000-0000-0000-0000-000000000006',
    'Normal',
    52.8,   -- sum of 8 skinfold measurements
    165.0,  -- mother's height
    182.0,  -- father's height
    'Measurements taken post-training, well-hydrated. Athlete shows good muscle definition for swimmer.'
);

-- ============================================================================
-- SESSION NOTES & DETAILS
-- ============================================================================

-- Insert sample session notes
INSERT INTO consultation.session_note (sessions_id, consultation_objective, main_nutrition_diagnosis, follow_up_note, intervention_note, other_remarks)
VALUES (
    '00000000-0000-0000-0000-000000000006',
    'Optimize nutrition for upcoming competition season. Focus on energy availability and recovery nutrition.',
    'Inadequate post-training protein intake',
    'Schedule follow-up in 2 weeks to assess progress',
    'Implement structured post-training nutrition protocol',
    'Athlete demonstrates good nutritional knowledge but needs guidance on timing'
);

-- ============================================================================
-- MEAL LOG DATA
-- ============================================================================

-- Insert sample meal log
INSERT INTO consultation.session_meal_log (sessions_id, am_breakfast_food, am_breakfast_macro, am_training_food, am_training_macro, pm_lunch_food, pm_lunch_macro, pm_training_food, pm_training_macro, pm_dinner_food, pm_dinner_macro, supper_food, supper_macro, total_carbohydrate_intake, total_protein_intake, total_fat_intake, other_remarks)
VALUES (
    '00000000-0000-0000-0000-000000000006',
    'Oatmeal with banana, berries, and Greek yogurt',
    'CHO: 65g, PRO: 20g, FAT: 8g',
    'Sports drink + banana',
    'CHO: 35g, PRO: 0g, FAT: 0g',
    'Grilled chicken salad with quinoa',
    'CHO: 45g, PRO: 35g, FAT: 12g',
    'Recovery smoothie (protein powder, milk, fruit)',
    'CHO: 40g, PRO: 25g, FAT: 5g',
    'Salmon with sweet potato and vegetables',
    'CHO: 55g, PRO: 40g, FAT: 15g',
    'Greek yogurt with nuts',
    'CHO: 15g, PRO: 15g, FAT: 10g',
    255.0,  -- total carbs
    135.0,  -- total protein
    50.0,   -- total fat
    'Athlete tracks intake using MyFitnessPal. Good adherence to meal timing.'
);

-- ============================================================================
-- TRAINING SCHEDULE DATA
-- ============================================================================

-- Insert sample training schedule
INSERT INTO consultation.session_training_schedule (sessions_id, mon_am, mon_pm, mon_training_hours, mon_rpe, tues_am, tues_pm, tues_training_hours, tues_rpe, wed_am, wed_pm, wed_training_hours, wed_rpe, thur_am, thur_pm, thur_training_hours, thur_rpe, fri_am, fri_pm, fri_training_hours, fri_rpe, sat_am, sat_pm, sat_training_hours, sat_rpe, sun_am, sun_pm, sun_training_hours, sun_rpe, upcoming_major_competitions, upcoming_local_competitions, current_performance, coach_performance_goals, athlete_performance_goals, other_remarks)
VALUES (
    '00000000-0000-0000-0000-000000000006',
    'Pool - Technique & Aerobic', 'Gym - Strength', 2.5, 6.5,  -- Monday
    'Pool - Speed Work', 'Recovery Swim', 2.0, 8.0,             -- Tuesday
    'Pool - Distance Set', 'Rest', 1.5, 7.0,                   -- Wednesday
    'Pool - Sprint Sets', 'Gym - Power', 2.5, 8.5,             -- Thursday
    'Pool - Race Prep', 'Recovery', 1.5, 6.0,                  -- Friday
    'Competition/Time Trial', 'Easy Swim', 2.0, 7.5,           -- Saturday
    'Rest/Active Recovery', 'Light Swim', 1.0, 4.0,            -- Sunday
    'National Championships (June), SEA Games Trials (August)',
    'State Championships (April), Regional Meet (May)',
    'Recent PB in 100m Free: 52.85s, showing consistent improvement',
    'Target: Sub-52s in 100m Free by Nationals, improve starts and turns',
    'Make national team for SEA Games, improve consistency in races',
    'Double training days Tuesday/Thursday. Peak competition phase approaching.'
);

-- ============================================================================
-- MEDICAL HISTORY - SESSION SPECIFIC DATA
-- ============================================================================

-- Insert sample puberty data (if applicable - this athlete is 18+ but for completeness)
INSERT INTO consultation.session_puberty (sessions_id, period_of_growth_spurt, other_remarks)
VALUES (
    '00000000-0000-0000-0000-000000000006',
    'Growth spurt occurred around age 14-15, approximately 3 years ago',
    'Growth phase completed. No current concerns related to pubertal development.'
);

-- Insert sample bowel movement data
INSERT INTO consultation.session_bowel_movement (sessions_id, regular_bowel_movement, frequency_of_bowel_movement, stool_visual, other_remarks)
VALUES (
    '00000000-0000-0000-0000-000000000006',
    true,
    'Once daily, usually morning',
    'Type 3-4 on Bristol scale',
    'No digestive issues reported. Regular pattern maintained.'
);

-- Insert sample hydration data
INSERT INTO consultation.session_hydration (sessions_id, water_intake_per_day, urine_colour, hydration_status, other_remarks)
VALUES (
    '00000000-0000-0000-0000-000000000006',
    3.2,  -- liters per day
    'Pale yellow (2-3 on urine color chart)',
    'Well hydrated',
    'Good hydration habits. Carries water bottle consistently. Uses electrolyte replacement during long sessions.'
);

-- Insert sample period data (for completeness - N/A for male athlete but included for schema)
INSERT INTO consultation.session_period (sessions_id, other_remarks)
VALUES (
    '00000000-0000-0000-0000-000000000006',
    'Not applicable - male athlete'
);

-- ============================================================================
-- OPEN ITEMS (Action Items)
-- ============================================================================

-- Insert sample open items
INSERT INTO consultation.session_open_item (sessions_id, open_item_status_id, description, open_item, owner, due_date, other_remarks)
VALUES 
    ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000005', 'Improve post-training nutrition timing', 'Consume protein within 30 minutes post-training', 'Athlete', '2024-03-01', 'Focus on afternoon training sessions'),
    ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000005', 'Monitor energy levels', 'Track fatigue levels daily for 2 weeks', 'Athlete', '2024-03-08', 'Use 1-10 scale in training diary'),
    ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000005', 'Meal prep planning', 'Develop 7-day competition meal prep plan', 'Nutritionist', '2024-02-28', 'Include travel day options');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the data was inserted correctly

SELECT 'ATHLETE DATA' as check_type;
SELECT a.id, a.athlete_name_abbr, s.sport 
FROM ams.athlete a 
JOIN ams.sport_lookup s ON a.sport_id = s.id 
WHERE a.id = '019c8123-ce08-7cf6-823a-1e786ae9bc69';

SELECT 'CONSULTATION SESSION' as check_type;
SELECT cs.id, cs.date_of_consult, n.name as nutritionist_name, toc.type_of_consult
FROM consultation.sessions cs
JOIN ams.nutritionist n ON cs.nutritionist_id = n.id
JOIN consultation.type_of_consult_lookup toc ON cs.type_of_consult_id = toc.id
WHERE cs.athlete_id = '019c8123-ce08-7cf6-823a-1e786ae9bc69';

SELECT 'ANTHROPOMETRY DATA' as check_type;
SELECT snr.anthropometry_height_cm, snr.anthropometry_weight_kg, sa.bmi_category, sa.sum_of_8_skinfold
FROM consultation.session_nutrition_review snr
JOIN consultation.session_anthropometry sa ON snr.sessions_id = sa.sessions_id
WHERE snr.sessions_id = '00000000-0000-0000-0000-000000000006';

SELECT 'MEAL LOG DATA' as check_type;
SELECT am_breakfast_food, total_carbohydrate_intake, total_protein_intake, total_fat_intake
FROM consultation.session_meal_log
WHERE sessions_id = '00000000-0000-0000-0000-000000000006';

SELECT 'TRAINING SCHEDULE DATA' as check_type;
SELECT mon_am, mon_pm, mon_training_hours, current_performance
FROM consultation.session_training_schedule
WHERE sessions_id = '00000000-0000-0000-0000-000000000006';

SELECT 'OPEN ITEMS DATA' as check_type;
SELECT soi.description, soi.open_item, soi.due_date, oils.open_item_status
FROM consultation.session_open_item soi
JOIN consultation.open_item_status_lookup oils ON soi.open_item_status_id = oils.id
WHERE soi.sessions_id = '00000000-0000-0000-0000-000000000006';