BEGIN;

-- 1. ENABLE EXTENSION (Critical for SSS.Supplement)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. CREATE SCHEMAS
CREATE SCHEMA IF NOT EXISTS sss;
CREATE SCHEMA IF NOT EXISTS ams;
CREATE SCHEMA IF NOT EXISTS consultation;

-- ========================================================
-- SSS: LOGISTICS & PRODUCT SCHEMA
-- ========================================================

CREATE TABLE sss.webscraper_catalog_url (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  product_catalog_website TEXT NOT NULL,
  number_of_catalog_page INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE sss.supplement_packaging_form_lookup (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  supplement_packaging_form TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE sss.ticket_status_lookup (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  ticket_status TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE sss.batch_stock_status_lookup (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  batch_stock_status TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE sss.supplement_status_lookup (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  supplement_status TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE sss.supplement_staging (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  supplement_packaging_form_id UUID NOT NULL,
  supplement_status_id UUID NOT NULL,
  supplement_input_type TEXT,
  supplement_name TEXT,
  supplement_brand TEXT,
  supplement_description TEXT,
  supplement_ingredient JSONB,
  nutritional_info_per_100g JSONB,
  nutritional_info_per_serving JSONB,
  nutritional_info_per_serving_definition TEXT,
  supplement_warning_label TEXT,
  supplement_certifications TEXT,
  supplement_additional_information TEXT,
  batch_testing_org TEXT,
  webscraper_catalog_url_id UUID,
  product_source_url TEXT[],
  scraper_version TEXT,
  is_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  promoted_to_supplement_id UUID
);

CREATE TABLE sss.supplement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  supplement_packaging_form_id UUID NOT NULL,
  supplement_status_id UUID NOT NULL,
  approved_by UUID NOT NULL, -- Links to Nutritionist
  supplement_input_type TEXT,
  supplement_name TEXT,
  supplement_brand TEXT,
  supplement_description TEXT,
  supplement_ingredient JSONB,
  nutritional_info_per_100g JSONB,
  nutritional_info_per_serving JSONB,
  nutritional_info_per_serving_definition TEXT,
  supplement_warning_label TEXT,
  supplement_certifications TEXT,
  supplement_additional_information TEXT,
  batch_testing_org TEXT,
  product_source_url TEXT[],
  scraper_version TEXT,
  
  -- Vector Embedding for Search (Requires Extension)
  vector_100g_ingredient vector(386),
  vector_perserving_ingredient vector(386)
);

CREATE TABLE sss.inventory_batch (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  supplement_id UUID NOT NULL,
  batch_stock_status_id UUID NOT NULL,
  batch_number VARCHAR(100) UNIQUE,
  batch_initial_quantity INT NOT NULL,
  batch_price NUMERIC(10,2),
  batch_expiration_date DATE,
  batch_manufacture_date DATE
);

CREATE TABLE sss.inventory_ticket (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  inventory_batch_id UUID NOT NULL,
  athlete_id UUID NOT NULL,
  ticket_status_id UUID NOT NULL,
  prescription_id UUID NOT NULL,
  quantity SMALLINT NOT NULL
);

-- ========================================================
-- AMS: PEOPLE & PROFILES SCHEMA
-- ========================================================

CREATE TABLE ams.sport_lookup (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
	sport TEXT NOT NULL UNIQUE,
	is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE ams.nutritionist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  name TEXT
);

CREATE TABLE ams.coach (
	id UUID PRIMARY KEY	DEFAULT uuid_generate_v7(),
	name TEXT,
	sport_id UUID NOT NULL
);

CREATE TABLE ams.athlete (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  sport_id UUID NOT NULL,
  gender TEXT,
  sportsync_id TEXT,
  athlete_name_abbr TEXT,
  date_of_birth DATE, 
  CONSTRAINT chk_athlete_gender CHECK (gender IN ('MALE', 'FEMALE', 'OTHER'))
);

CREATE TABLE ams.coach_athlete_mapping (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
	athlete_id UUID NOT NULL,
	coach_id UUID NOT NULL,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE
);

CREATE TABLE ams.athlete_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    athlete_id UUID NOT NULL,
    carding_status TEXT,
    athlete_notified_on DATE,
    carding_start_date DATE,
    carding_end_date DATE,
    medical_clearance BOOLEAN DEFAULT FALSE,
    approved_start_date DATE,
    approved_end_date DATE,
    CONSTRAINT chk_carding_dates CHECK (carding_end_date >= carding_start_date),
    CONSTRAINT chk_approved_dates CHECK (approved_end_date >= approved_start_date)
);

CREATE TABLE ams.athlete_medical (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    athlete_id UUID NOT NULL,
    medical_condition TEXT,
    food_allergy TEXT,
    drug_allergy TEXT,
    past_injury TEXT,
    CONSTRAINT uq_medical_athlete UNIQUE (athlete_id)
);

CREATE TABLE ams.nutritionist_athlete_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    nutritionist_id UUID NOT NULL,
    athlete_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT uq_nutritionist_athlete UNIQUE (athlete_id, nutritionist_id)
);

-- ========================================================
-- CONSULTATION: WORKFLOW & LOGS SCHEMA
-- ========================================================

CREATE TABLE consultation.type_of_consult_lookup (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  type_of_consult TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE consultation.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  nutritionist_id UUID NOT NULL,
  athlete_id UUID NOT NULL,
  type_of_consult_id UUID NOT NULL,
  date_of_consult DATE DEFAULT CURRENT_DATE,
  date_of_next_follow_up DATE
  -- Note: Linked list columns (previous_session_id) removed as per input code
);

CREATE TABLE consultation.open_item_status_lookup (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  open_item_status TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE consultation.intervention_status_lookup (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  intervention_status TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE consultation.session_open_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  sessions_id UUID NOT NULL,
  open_item_status_id UUID NOT NULL,
  description TEXT,
  open_item TEXT,
  owner TEXT,
  due_date DATE,
  other_remarks TEXT
);

CREATE TABLE consultation.session_prescription (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  sessions_id UUID NOT NULL,
  batch_id UUID NOT NULL,
  intervention_status_id UUID NOT NULL,
  dosage INT,
  dosage_unit TEXT,
  dosage_frequency TEXT,
  start_date DATE,
  projected_end_date DATE,
  follow_up_required BOOLEAN DEFAULT FALSE,
  other_remarks TEXT
);

CREATE TABLE consultation.session_anthropometry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  sessions_id UUID NOT NULL,
  bmi_category TEXT, 
  sum_of_8_skinfold NUMERIC(5,2),
  mother_height NUMERIC(5,2),
  father_height NUMERIC(5,2),
  other_remarks TEXT
);

CREATE TABLE consultation.session_training_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  sessions_id UUID NOT NULL,
  mon_am TEXT, mon_pm TEXT, mon_training_hours NUMERIC(4,1), mon_rpe NUMERIC(3,1),
  tues_am TEXT, tues_pm TEXT, tues_training_hours NUMERIC(4,1), tues_rpe NUMERIC(3,1),
  wed_am TEXT, wed_pm TEXT, wed_training_hours NUMERIC(4,1), wed_rpe NUMERIC(3,1),
  thur_am TEXT, thur_pm TEXT, thur_training_hours NUMERIC(4,1), thur_rpe NUMERIC(3,1),
  fri_am text, fri_pm text, fri_training_hours NUMERIC(4,1), fri_rpe NUMERIC(3,1),
  sat_am TEXT, sat_pm TEXT, sat_training_hours NUMERIC(4,1), sat_rpe NUMERIC(3,1),
  sun_am TEXT, sun_pm TEXT, sun_training_hours NUMERIC(4,1), sun_rpe NUMERIC(3,1),
  total_training_hours NUMERIC GENERATED ALWAYS AS (
    COALESCE(mon_training_hours,0) + COALESCE(tues_training_hours,0) + 
    COALESCE(wed_training_hours,0) + COALESCE(thur_training_hours,0) + 
    COALESCE(fri_training_hours,0) + COALESCE(sat_training_hours,0) + 
    COALESCE(sun_training_hours,0)
  ) STORED,
  upcoming_major_competitions TEXT,
  upcoming_local_competitions TEXT,
  current_performance TEXT,
  coach_performance_goals TEXT,
  athlete_performance_goals TEXT,
  other_remarks TEXT
);

CREATE TABLE consultation.session_meal_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  sessions_id UUID NOT NULL,
  am_breakfast_food TEXT, am_breakfast_macro TEXT,
  am_training_food TEXT, am_training_macro TEXT,
  pm_lunch_food TEXT, pm_lunch_macro TEXT,
  pm_training_food TEXT, pm_training_macro TEXT,
  pm_dinner_food TEXT, pm_dinner_macro TEXT,
  supper_food TEXT, supper_macro TEXT,
  total_carbohydrate_intake NUMERIC(6,1),
  total_protein_intake NUMERIC(6,1),
  total_fat_intake NUMERIC(6,1),
  other_remarks TEXT
);

CREATE TABLE consultation.session_note (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  sessions_id UUID NOT NULL,
  consultation_objective TEXT,
  main_nutrition_diagnosis TEXT,
  follow_up_note TEXT,
  intervention_note TEXT,
  medical_remarks TEXT,
  other_remarks TEXT
);

CREATE TABLE consultation.session_nutrition_review (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  sessions_id UUID NOT NULL,

  -- Inputs
  anthropometry_height_cm NUMERIC(5,2),
  anthropometry_weight_kg NUMERIC(5,2),
  anthropometry_target_weight_kg NUMERIC(5,2),
  anthropometry_fat_mass_kg NUMERIC(5,2),
  anthropometry_skeletal_muscle_mass_kg NUMERIC(5,2),
  training_physical_activity_level_pal NUMERIC(3,2),
  estimated_carbohydrate_intake_g NUMERIC(6,1),
  estimated_protein_intake_g NUMERIC(6,1),
  estimated_fat_intake_g NUMERIC(6,1),

  minimum_carbohydrate_requirment_g_kg_bw NUMERIC(4,1),
  maximum_carbohydrate_requirment_g_kg_bw NUMERIC(4,1),
  minimum_protein_requirment_g_kg_bw NUMERIC(4,1),
  maximum_protein_requirment_g_kg_bw NUMERIC(4,1),
  minimum_fat_requirment_g_kg_bw NUMERIC(4,1),
  maximum_fat_requirment_g_kg_bw NUMERIC(4,1),

  comments_on_weekday_intake TEXT,
  comments_on_weekend_intake TEXT,
  other_remarks TEXT,

  -- Calculations
  anthropometry_bmi NUMERIC GENERATED ALWAYS AS (
    anthropometry_weight_kg / NULLIF(((anthropometry_height_cm/100)^2), 0)
  ) STORED,

  anthropometry_target_bmi NUMERIC GENERATED ALWAYS AS (
    anthropometry_target_weight_kg / NULLIF(((anthropometry_height_cm/100)^2), 0)
  ) STORED,

  anthropometry_fat_mass_percentage NUMERIC GENERATED ALWAYS AS (
    (anthropometry_fat_mass_kg / NULLIF(anthropometry_weight_kg, 0)) * 100
  ) STORED,

  anthropometry_skeletal_muscle_mass_percentage NUMERIC GENERATED ALWAYS AS (
    (anthropometry_skeletal_muscle_mass_kg / NULLIF(anthropometry_weight_kg, 0)) * 100
  ) STORED,

  hydration_water_intake_for_target_weight NUMERIC GENERATED ALWAYS AS (45 * anthropometry_target_weight_kg) STORED,
  hydration_requirement_for_water_intake NUMERIC GENERATED ALWAYS AS (45 * anthropometry_weight_kg) STORED,

  minimum_carbohydrate_requirment_g NUMERIC GENERATED ALWAYS AS (minimum_carbohydrate_requirment_g_kg_bw * anthropometry_weight_kg) STORED,
  maximum_carbohydrate_requirment_g NUMERIC GENERATED ALWAYS AS (maximum_carbohydrate_requirment_g_kg_bw * anthropometry_weight_kg) STORED,
  minimum_protein_requirment_g NUMERIC GENERATED ALWAYS AS (minimum_protein_requirment_g_kg_bw * anthropometry_weight_kg) STORED,
  maximum_protein_requirment_g NUMERIC GENERATED ALWAYS AS (maximum_protein_requirment_g_kg_bw * anthropometry_weight_kg) STORED,
  minimum_fat_requirment_g NUMERIC GENERATED ALWAYS AS (minimum_fat_requirment_g_kg_bw * anthropometry_weight_kg) STORED,
  maximum_fat_requirment_g NUMERIC GENERATED ALWAYS AS (maximum_fat_requirment_g_kg_bw * anthropometry_weight_kg) STORED,

  target_minimum_carbohydrate_requirment_g NUMERIC GENERATED ALWAYS AS (minimum_carbohydrate_requirment_g_kg_bw * anthropometry_target_weight_kg) STORED,
  target_maximum_carbohydrate_requirment_g NUMERIC GENERATED ALWAYS AS (maximum_carbohydrate_requirment_g_kg_bw * anthropometry_target_weight_kg) STORED,
  target_minimum_protein_requirment_g NUMERIC GENERATED ALWAYS AS (minimum_protein_requirment_g_kg_bw * anthropometry_target_weight_kg) STORED,
  target_maximum_protein_requirment_g NUMERIC GENERATED ALWAYS AS (maximum_protein_requirment_g_kg_bw * anthropometry_target_weight_kg) STORED,
  target_minimum_fat_requirment_g NUMERIC GENERATED ALWAYS AS (minimum_fat_requirment_g_kg_bw * anthropometry_target_weight_kg) STORED,
  target_maximum_fat_requirment_g NUMERIC GENERATED ALWAYS AS (maximum_fat_requirment_g_kg_bw * anthropometry_target_weight_kg) STORED,

  percentage_of_min_carbohydrate_required NUMERIC GENERATED ALWAYS AS (
    estimated_carbohydrate_intake_g / NULLIF(minimum_carbohydrate_requirment_g_kg_bw * anthropometry_weight_kg, 0)
  ) STORED,

  percentage_of_min_protein_required NUMERIC GENERATED ALWAYS AS (
    estimated_protein_intake_g / NULLIF(minimum_protein_requirment_g_kg_bw * anthropometry_weight_kg, 0)
  ) STORED,

  percentage_of_min_fat_required NUMERIC GENERATED ALWAYS AS (
    estimated_fat_intake_g / NULLIF(minimum_fat_requirment_g_kg_bw * anthropometry_weight_kg, 0)
  ) STORED,

  rmr_male_resting_metabolic_rate NUMERIC GENERATED ALWAYS AS (
    (11.1 * anthropometry_weight_kg) + (8.4 * anthropometry_height_cm) - 340
  ) STORED,
  rmr_male_target_weight NUMERIC GENERATED ALWAYS AS (
    (11.1 * anthropometry_target_weight_kg) + (8.4 * anthropometry_height_cm) - 340
  ) STORED,
  tee_male_total_energy_expenditure NUMERIC GENERATED ALWAYS AS (
    ((11.1 * anthropometry_weight_kg) + (8.4 * anthropometry_height_cm) - 340) * training_physical_activity_level_pal
  ) STORED,
  tee_male_target_weight NUMERIC GENERATED ALWAYS AS (
    ((11.1 * anthropometry_target_weight_kg) + (8.4 * anthropometry_height_cm) - 340) * training_physical_activity_level_pal
  ) STORED,

  rmr_female_resting_metabolic_rate NUMERIC GENERATED ALWAYS AS (
    (11.1 * anthropometry_weight_kg) + (8.4 * anthropometry_height_cm) - 540
  ) STORED,
  rmr_female_target_weight NUMERIC GENERATED ALWAYS AS (
    (11.1 * anthropometry_target_weight_kg) + (8.4 * anthropometry_height_cm) - 540
  ) STORED,
  tee_female_total_energy_expenditure NUMERIC GENERATED ALWAYS AS (
    ((11.1 * anthropometry_weight_kg) + (8.4 * anthropometry_height_cm) - 540) * training_physical_activity_level_pal
  ) STORED,
  tee_female_target_weight NUMERIC GENERATED ALWAYS AS (
    ((11.1 * anthropometry_target_weight_kg) + (8.4 * anthropometry_height_cm) - 540) * training_physical_activity_level_pal
  ) STORED
);

CREATE TABLE consultation.session_period (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  sessions_id UUID NOT NULL,
  date_of_first_period DATE,
  age_of_menarchy NUMERIC(4,1),
  regularity_of_period NUMERIC,
  length_of_typical_menstrual_cycle NUMERIC,
  length_of_period NUMERIC,
  heaviness_of_menstrual_bleeding NUMERIC,
  any_signs_and_symptoms TEXT,
  other_remarks TEXT
);

CREATE TABLE consultation.session_puberty (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  sessions_id UUID NOT NULL,
  period_of_growth_spurt TEXT,
  other_remarks TEXT
);

CREATE TABLE consultation.session_bowel_movement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  sessions_id UUID NOT NULL,
  regular_bowel_movement BOOLEAN,
  frequency_of_bowel_movement TEXT,
  stool_visual TEXT,
  other_remarks TEXT
);

CREATE TABLE consultation.session_hydration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  sessions_id UUID NOT NULL,
  water_intake_per_day NUMERIC(4,1),
  urine_colour TEXT,
  hydration_status TEXT,
  other_remarks TEXT
);

COMMIT;