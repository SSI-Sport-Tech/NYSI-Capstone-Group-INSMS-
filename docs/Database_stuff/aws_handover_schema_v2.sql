--
-- PostgreSQL database dump
--

\restrict Mhbavvsvb6lEfgB7B8AjjOet8oRvobO5FVxmhbdpGWoWvSyfRrrQO3wS2D9Th3N

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.8 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ams; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA ams;


--
-- Name: audit; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA audit;


--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: consultation; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA consultation;


--
-- Name: sss; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA sss;


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: audit_trigger_func(); Type: FUNCTION; Schema: audit; Owner: -
--

CREATE FUNCTION audit.audit_trigger_func() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_app_user UUID;
    record_id_val UUID;
    old_data JSONB;
    new_data JSONB;
BEGIN
    BEGIN
        current_app_user := current_setting('app.current_user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_app_user := NULL;
    END;

    IF (TG_OP = 'INSERT') THEN
        record_id_val := NEW.id;
        old_data := NULL;
        new_data := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        record_id_val := NEW.id;
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF (TG_OP = 'DELETE') THEN
        record_id_val := OLD.id;
        old_data := to_jsonb(OLD);
        new_data := NULL;
    END IF;

    INSERT INTO audit.audit_log (user_id, table_name, record_id, action, old_values, new_values)
    VALUES (current_app_user, TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME, record_id_val, TG_OP, old_data, new_data);

    IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;


--
-- Name: uuid_generate_v7(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.uuid_generate_v7() RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  -- Get current timestamp in milliseconds
  unix_ts_ms := substring(
    int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) 
    from 3
  );

  -- FIXED: Now it explicitly looks in the 'public' schema
  uuid_bytes := unix_ts_ms || public.gen_random_bytes(10);

  -- Set version bit to 7
  uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);

  -- Set variant bit to 2
  uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);

  RETURN encode(uuid_bytes, 'hex')::uuid;
END
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: athlete; Type: TABLE; Schema: ams; Owner: -
--

CREATE TABLE ams.athlete (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    sport_id uuid NOT NULL,
    gender text,
    sportsync_id text,
    athlete_name_abbr text,
    date_of_birth date,
    user_id uuid,
    ethnicity text,
    target_event text,
    sport_start_date date,
    CONSTRAINT chk_athlete_gender CHECK ((gender = ANY (ARRAY['MALE'::text, 'FEMALE'::text, 'OTHER'::text])))
);


--
-- Name: athlete_medical; Type: TABLE; Schema: ams; Owner: -
--

CREATE TABLE ams.athlete_medical (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    athlete_id uuid NOT NULL,
    medical_condition text,
    food_allergy text,
    drug_allergy text,
    past_injury text,
    medical_remarks text,
    dietary_restriction text
);


--
-- Name: athlete_registry; Type: TABLE; Schema: ams; Owner: -
--

CREATE TABLE ams.athlete_registry (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    athlete_id uuid NOT NULL,
    carding_status text,
    athlete_notified_on date,
    carding_start_date date,
    carding_end_date date,
    medical_clearance boolean DEFAULT false,
    approved_start_date date,
    approved_end_date date,
    CONSTRAINT chk_approved_dates CHECK ((approved_end_date >= approved_start_date)),
    CONSTRAINT chk_carding_dates CHECK ((carding_end_date >= carding_start_date))
);


--
-- Name: coach; Type: TABLE; Schema: ams; Owner: -
--

CREATE TABLE ams.coach (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    name text,
    sport_id uuid NOT NULL,
    user_id uuid
);


--
-- Name: coach_athlete_mapping; Type: TABLE; Schema: ams; Owner: -
--

CREATE TABLE ams.coach_athlete_mapping (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    athlete_id uuid NOT NULL,
    coach_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: nutritionist; Type: TABLE; Schema: ams; Owner: -
--

CREATE TABLE ams.nutritionist (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    name text,
    user_id uuid
);


--
-- Name: nutritionist_athlete_mapping; Type: TABLE; Schema: ams; Owner: -
--

CREATE TABLE ams.nutritionist_athlete_mapping (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    nutritionist_id uuid NOT NULL,
    athlete_id uuid NOT NULL,
    is_active boolean DEFAULT true,
    is_pinned boolean DEFAULT false NOT NULL
);


--
-- Name: sport_lookup; Type: TABLE; Schema: ams; Owner: -
--

CREATE TABLE ams.sport_lookup (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    sport text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: user_athlete_pins; Type: TABLE; Schema: ams; Owner: -
--

CREATE TABLE ams.user_athlete_pins (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    user_id uuid NOT NULL,
    athlete_id uuid NOT NULL,
    is_pinned boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_log; Type: TABLE; Schema: audit; Owner: -
--

CREATE TABLE audit.audit_log (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    user_id uuid,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    action text NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changed_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.user_sessions (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    ip_address inet,
    user_agent text,
    is_active boolean DEFAULT true,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    is_email_verified boolean DEFAULT false,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    first_name character varying(100),
    last_name character varying(100),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['IT_ADMIN'::character varying, 'ADMIN'::character varying, 'NUTRITIONIST'::character varying, 'COACH'::character varying, 'ATHLETE'::character varying])::text[])))
);


--
-- Name: verification_codes; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.verification_codes (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    user_id uuid NOT NULL,
    code character varying(6) NOT NULL,
    purpose character varying(50) NOT NULL,
    attempts integer DEFAULT 0,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT verification_codes_purpose_check CHECK (((purpose)::text = ANY ((ARRAY['LOGIN_2FA'::character varying, 'PASSWORD_RESET'::character varying, 'EMAIL_VERIFY'::character varying])::text[])))
);


--
-- Name: nutrition_diagnosis_lookup; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.nutrition_diagnosis_lookup (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    category text NOT NULL,
    diagnosis text NOT NULL,
    is_active boolean DEFAULT true
);


--
-- Name: open_item_status_lookup; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.open_item_status_lookup (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    open_item_status text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: session_anthropometry; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.session_anthropometry (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    sessions_id uuid NOT NULL,
    bmi_category text,
    sum_of_8_skinfold numeric(5,2),
    mother_height numeric(5,2),
    father_height numeric(5,2),
    other_remarks text,
    CONSTRAINT chk_anthro_bmi CHECK ((bmi_category = ANY (ARRAY['Normal'::text, 'Underweight'::text, 'Overweight'::text])))
);


--
-- Name: session_bowel_movement; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.session_bowel_movement (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    sessions_id uuid NOT NULL,
    regular_bowel_movement boolean,
    frequency_of_bowel_movement text,
    stool_visual text,
    other_remarks text
);


--
-- Name: session_hydration; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.session_hydration (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    sessions_id uuid NOT NULL,
    water_intake_per_day numeric(4,1),
    urine_colour text,
    hydration_status text,
    other_remarks text
);


--
-- Name: session_meal_log; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.session_meal_log (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    sessions_id uuid NOT NULL,
    am_breakfast_food text,
    am_breakfast_macro text,
    am_training_food text,
    am_training_macro text,
    pm_lunch_food text,
    pm_lunch_macro text,
    pm_training_food text,
    pm_training_macro text,
    pm_dinner_food text,
    pm_dinner_macro text,
    supper_food text,
    supper_macro text,
    total_carbohydrate_intake numeric(6,1),
    total_protein_intake numeric(6,1),
    total_fat_intake numeric(6,1),
    other_remarks text
);


--
-- Name: session_note; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.session_note (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    sessions_id uuid NOT NULL,
    consultation_objective text,
    main_nutrition_diagnosis text,
    follow_up_note text,
    intervention_note text,
    other_remarks text,
    carbohydrates_review_id uuid,
    protein_review_id uuid,
    fat_review_id uuid,
    fibre_review_id uuid,
    iron_review_id uuid,
    calcium_review_id uuid,
    micronutrients_review_id uuid,
    other_review text
);


--
-- Name: session_nutrition_review; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.session_nutrition_review (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    sessions_id uuid NOT NULL,
    anthropometry_height_cm numeric(5,2),
    anthropometry_weight_kg numeric(5,2),
    anthropometry_target_weight_kg numeric(5,2),
    anthropometry_fat_mass_kg numeric(5,2),
    anthropometry_skeletal_muscle_mass_kg numeric(5,2),
    training_physical_activity_level_pal numeric(3,2),
    estimated_carbohydrate_intake_g numeric(6,1),
    estimated_protein_intake_g numeric(6,1),
    estimated_fat_intake_g numeric(6,1),
    minimum_carbohydrate_requirment_g_kg_bw numeric(4,1),
    maximum_carbohydrate_requirment_g_kg_bw numeric(4,1),
    minimum_protein_requirment_g_kg_bw numeric(4,1),
    maximum_protein_requirment_g_kg_bw numeric(4,1),
    minimum_fat_requirment_g_kg_bw numeric(4,1),
    maximum_fat_requirment_g_kg_bw numeric(4,1),
    comments_on_weekday_intake text,
    comments_on_weekend_intake text,
    other_remarks text,
    anthropometry_bmi numeric GENERATED ALWAYS AS ((anthropometry_weight_kg / NULLIF(((anthropometry_height_cm / (100)::numeric) ^ (2)::numeric), (0)::numeric))) STORED,
    anthropometry_target_bmi numeric GENERATED ALWAYS AS ((anthropometry_target_weight_kg / NULLIF(((anthropometry_height_cm / (100)::numeric) ^ (2)::numeric), (0)::numeric))) STORED,
    anthropometry_fat_mass_percentage numeric GENERATED ALWAYS AS (((anthropometry_fat_mass_kg / NULLIF(anthropometry_weight_kg, (0)::numeric)) * (100)::numeric)) STORED,
    anthropometry_skeletal_muscle_mass_percentage numeric GENERATED ALWAYS AS (((anthropometry_skeletal_muscle_mass_kg / NULLIF(anthropometry_weight_kg, (0)::numeric)) * (100)::numeric)) STORED,
    hydration_water_intake_for_target_weight numeric GENERATED ALWAYS AS (((45)::numeric * anthropometry_target_weight_kg)) STORED,
    hydration_requirement_for_water_intake numeric GENERATED ALWAYS AS (((45)::numeric * anthropometry_weight_kg)) STORED,
    minimum_carbohydrate_requirment_g numeric GENERATED ALWAYS AS ((minimum_carbohydrate_requirment_g_kg_bw * anthropometry_weight_kg)) STORED,
    maximum_carbohydrate_requirment_g numeric GENERATED ALWAYS AS ((maximum_carbohydrate_requirment_g_kg_bw * anthropometry_weight_kg)) STORED,
    minimum_protein_requirment_g numeric GENERATED ALWAYS AS ((minimum_protein_requirment_g_kg_bw * anthropometry_weight_kg)) STORED,
    maximum_protein_requirment_g numeric GENERATED ALWAYS AS ((maximum_protein_requirment_g_kg_bw * anthropometry_weight_kg)) STORED,
    minimum_fat_requirment_g numeric GENERATED ALWAYS AS ((minimum_fat_requirment_g_kg_bw * anthropometry_weight_kg)) STORED,
    maximum_fat_requirment_g numeric GENERATED ALWAYS AS ((maximum_fat_requirment_g_kg_bw * anthropometry_weight_kg)) STORED,
    target_minimum_carbohydrate_requirment_g numeric GENERATED ALWAYS AS ((minimum_carbohydrate_requirment_g_kg_bw * anthropometry_target_weight_kg)) STORED,
    target_maximum_carbohydrate_requirment_g numeric GENERATED ALWAYS AS ((maximum_carbohydrate_requirment_g_kg_bw * anthropometry_target_weight_kg)) STORED,
    target_minimum_protein_requirment_g numeric GENERATED ALWAYS AS ((minimum_protein_requirment_g_kg_bw * anthropometry_target_weight_kg)) STORED,
    target_maximum_protein_requirment_g numeric GENERATED ALWAYS AS ((maximum_protein_requirment_g_kg_bw * anthropometry_target_weight_kg)) STORED,
    target_minimum_fat_requirment_g numeric GENERATED ALWAYS AS ((minimum_fat_requirment_g_kg_bw * anthropometry_target_weight_kg)) STORED,
    target_maximum_fat_requirment_g numeric GENERATED ALWAYS AS ((maximum_fat_requirment_g_kg_bw * anthropometry_target_weight_kg)) STORED,
    percentage_of_min_carbohydrate_required numeric GENERATED ALWAYS AS ((estimated_carbohydrate_intake_g / NULLIF((minimum_carbohydrate_requirment_g_kg_bw * anthropometry_weight_kg), (0)::numeric))) STORED,
    percentage_of_min_protein_required numeric GENERATED ALWAYS AS ((estimated_protein_intake_g / NULLIF((minimum_protein_requirment_g_kg_bw * anthropometry_weight_kg), (0)::numeric))) STORED,
    percentage_of_min_fat_required numeric GENERATED ALWAYS AS ((estimated_fat_intake_g / NULLIF((minimum_fat_requirment_g_kg_bw * anthropometry_weight_kg), (0)::numeric))) STORED,
    rmr_male_resting_metabolic_rate numeric GENERATED ALWAYS AS ((((11.1 * anthropometry_weight_kg) + (8.4 * anthropometry_height_cm)) - (340)::numeric)) STORED,
    rmr_male_target_weight numeric GENERATED ALWAYS AS ((((11.1 * anthropometry_target_weight_kg) + (8.4 * anthropometry_height_cm)) - (340)::numeric)) STORED,
    tee_male_total_energy_expenditure numeric GENERATED ALWAYS AS (((((11.1 * anthropometry_weight_kg) + (8.4 * anthropometry_height_cm)) - (340)::numeric) * training_physical_activity_level_pal)) STORED,
    tee_male_target_weight numeric GENERATED ALWAYS AS (((((11.1 * anthropometry_target_weight_kg) + (8.4 * anthropometry_height_cm)) - (340)::numeric) * training_physical_activity_level_pal)) STORED,
    rmr_female_resting_metabolic_rate numeric GENERATED ALWAYS AS ((((11.1 * anthropometry_weight_kg) + (8.4 * anthropometry_height_cm)) - (540)::numeric)) STORED,
    rmr_female_target_weight numeric GENERATED ALWAYS AS ((((11.1 * anthropometry_target_weight_kg) + (8.4 * anthropometry_height_cm)) - (540)::numeric)) STORED,
    tee_female_total_energy_expenditure numeric GENERATED ALWAYS AS (((((11.1 * anthropometry_weight_kg) + (8.4 * anthropometry_height_cm)) - (540)::numeric) * training_physical_activity_level_pal)) STORED,
    tee_female_target_weight numeric GENERATED ALWAYS AS (((((11.1 * anthropometry_target_weight_kg) + (8.4 * anthropometry_height_cm)) - (540)::numeric) * training_physical_activity_level_pal)) STORED
);


--
-- Name: session_open_item; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.session_open_item (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    sessions_id uuid NOT NULL,
    open_item_status_id uuid NOT NULL,
    description text,
    open_item text,
    owner text,
    due_date date,
    other_remarks text
);


--
-- Name: session_period; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.session_period (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    sessions_id uuid NOT NULL,
    date_of_first_period date,
    age_of_menarchy numeric(4,1),
    regularity_of_period numeric,
    length_of_typical_menstrual_cycle numeric,
    length_of_period numeric,
    heaviness_of_menstrual_bleeding numeric,
    any_signs_and_symptoms text,
    other_remarks text
);


--
-- Name: session_prescription; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.session_prescription (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    sessions_id uuid NOT NULL,
    batch_id uuid NOT NULL,
    dosage integer,
    dosage_unit text,
    dosage_frequency text,
    start_date date,
    projected_end_date date,
    follow_up_required boolean DEFAULT false,
    other_remarks text
);


--
-- Name: session_puberty; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.session_puberty (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    sessions_id uuid NOT NULL,
    period_of_growth_spurt text,
    other_remarks text
);


--
-- Name: session_training_schedule; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.session_training_schedule (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    sessions_id uuid NOT NULL,
    mon_am text,
    mon_pm text,
    mon_training_hours numeric(4,1),
    mon_rpe numeric(3,1),
    tues_am text,
    tues_pm text,
    tues_training_hours numeric(4,1),
    tues_rpe numeric(3,1),
    wed_am text,
    wed_pm text,
    wed_training_hours numeric(4,1),
    wed_rpe numeric(3,1),
    thur_am text,
    thur_pm text,
    thur_training_hours numeric(4,1),
    thur_rpe numeric(3,1),
    fri_am text,
    fri_pm text,
    fri_training_hours numeric(4,1),
    fri_rpe numeric(3,1),
    sat_am text,
    sat_pm text,
    sat_training_hours numeric(4,1),
    sat_rpe numeric(3,1),
    sun_am text,
    sun_pm text,
    sun_training_hours numeric(4,1),
    sun_rpe numeric(3,1),
    total_training_hours numeric GENERATED ALWAYS AS (((((((COALESCE(mon_training_hours, (0)::numeric) + COALESCE(tues_training_hours, (0)::numeric)) + COALESCE(wed_training_hours, (0)::numeric)) + COALESCE(thur_training_hours, (0)::numeric)) + COALESCE(fri_training_hours, (0)::numeric)) + COALESCE(sat_training_hours, (0)::numeric)) + COALESCE(sun_training_hours, (0)::numeric))) STORED,
    upcoming_major_competitions text,
    upcoming_local_competitions text,
    current_performance text,
    coach_performance_goals text,
    athlete_performance_goals text,
    other_remarks text
);


--
-- Name: sessions; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.sessions (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    nutritionist_id uuid NOT NULL,
    athlete_id uuid NOT NULL,
    type_of_consult_id uuid NOT NULL,
    date_of_consult date DEFAULT CURRENT_DATE,
    date_of_next_follow_up date,
    title_description text,
    venue text,
    time_of_consult time without time zone,
    time_of_next_follow_up time without time zone
);


--
-- Name: type_of_consult_lookup; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.type_of_consult_lookup (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    type_of_consult text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: batch_stock_status_lookup; Type: TABLE; Schema: sss; Owner: -
--

CREATE TABLE sss.batch_stock_status_lookup (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    batch_stock_status text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: inventory_batch; Type: TABLE; Schema: sss; Owner: -
--

CREATE TABLE sss.inventory_batch (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    supplement_id uuid NOT NULL,
    batch_number character varying(100),
    batch_initial_quantity integer NOT NULL,
    batch_price numeric(10,2),
    batch_expiration_date date,
    batch_manufacture_date date,
    batch_stock_status_id uuid NOT NULL
);


--
-- Name: inventory_ticket; Type: TABLE; Schema: sss; Owner: -
--

CREATE TABLE sss.inventory_ticket (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    inventory_batch_id uuid NOT NULL,
    athlete_id uuid NOT NULL,
    ticket_status_id uuid NOT NULL,
    quantity smallint NOT NULL,
    prescription_id uuid NOT NULL
);


--
-- Name: supplement; Type: TABLE; Schema: sss; Owner: -
--

CREATE TABLE sss.supplement (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplement_packaging_form_id uuid NOT NULL,
    supplement_input_type text,
    supplement_name text,
    supplement_brand text,
    supplement_description text,
    supplement_ingredient jsonb,
    nutritional_info_per_100g jsonb,
    nutritional_info_per_serving jsonb,
    nutritional_info_per_serving_definition text,
    supplement_warning_label text,
    supplement_certifications text,
    supplement_additional_information text,
    batch_testing_org text,
    scraper_version text,
    supplement_status_id uuid NOT NULL,
    product_source_url text[],
    approved_by uuid NOT NULL,
    vector_100g_ingredient public.vector(384),
    vector_perserving_ingredient public.vector(384)
);


--
-- Name: supplement_packaging_form_lookup; Type: TABLE; Schema: sss; Owner: -
--

CREATE TABLE sss.supplement_packaging_form_lookup (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    supplement_packaging_form text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: supplement_staging; Type: TABLE; Schema: sss; Owner: -
--

CREATE TABLE sss.supplement_staging (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    supplement_packaging_form_id uuid NOT NULL,
    supplement_input_type text,
    supplement_name text,
    supplement_brand text,
    supplement_description text,
    supplement_ingredient jsonb,
    nutritional_info_per_100g jsonb,
    nutritional_info_per_serving jsonb,
    nutritional_info_per_serving_definition text,
    supplement_warning_label text,
    supplement_certifications text,
    supplement_additional_information text,
    batch_testing_org text,
    webscraper_catalog_url_id uuid,
    scraper_version text,
    supplement_status_id uuid NOT NULL,
    product_source_url text[],
    is_reviewed boolean DEFAULT false NOT NULL,
    promoted_to_supplement_id uuid
);


--
-- Name: supplement_status_lookup; Type: TABLE; Schema: sss; Owner: -
--

CREATE TABLE sss.supplement_status_lookup (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    supplement_status text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: ticket_status_lookup; Type: TABLE; Schema: sss; Owner: -
--

CREATE TABLE sss.ticket_status_lookup (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    ticket_status text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: webscraper_catalog_url; Type: TABLE; Schema: sss; Owner: -
--

CREATE TABLE sss.webscraper_catalog_url (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    product_catalog_website text NOT NULL,
    number_of_catalog_page integer,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: athlete_medical athlete_medical_pkey; Type: CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.athlete_medical
    ADD CONSTRAINT athlete_medical_pkey PRIMARY KEY (id);


--
-- Name: athlete athlete_pkey; Type: CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.athlete
    ADD CONSTRAINT athlete_pkey PRIMARY KEY (id);


--
-- Name: athlete_registry athlete_registry_pkey; Type: CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.athlete_registry
    ADD CONSTRAINT athlete_registry_pkey PRIMARY KEY (id);


--
-- Name: athlete athlete_user_id_key; Type: CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.athlete
    ADD CONSTRAINT athlete_user_id_key UNIQUE (user_id);


--
-- Name: coach_athlete_mapping coach_athlete_mapping_pkey; Type: CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.coach_athlete_mapping
    ADD CONSTRAINT coach_athlete_mapping_pkey PRIMARY KEY (id);


--
-- Name: coach coach_pkey; Type: CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.coach
    ADD CONSTRAINT coach_pkey PRIMARY KEY (id);


--
-- Name: coach coach_user_id_key; Type: CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.coach
    ADD CONSTRAINT coach_user_id_key UNIQUE (user_id);


--
-- Name: nutritionist_athlete_mapping nutritionist_athlete_mapping_pkey; Type: CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.nutritionist_athlete_mapping
    ADD CONSTRAINT nutritionist_athlete_mapping_pkey PRIMARY KEY (id);


--
-- Name: nutritionist nutritionist_pkey; Type: CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.nutritionist
    ADD CONSTRAINT nutritionist_pkey PRIMARY KEY (id);


--
-- Name: nutritionist nutritionist_user_id_key; Type: CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.nutritionist
    ADD CONSTRAINT nutritionist_user_id_key UNIQUE (user_id);


--
-- Name: sport_lookup sport_lookup_pkey; Type: CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.sport_lookup
    ADD CONSTRAINT sport_lookup_pkey PRIMARY KEY (id);


--
-- Name: sport_lookup sport_lookup_sport_key; Type: CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.sport_lookup
    ADD CONSTRAINT sport_lookup_sport_key UNIQUE (sport);


--
-- Name: coach_athlete_mapping uq_coach_athlete_map; Type: CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.coach_athlete_mapping
    ADD CONSTRAINT uq_coach_athlete_map UNIQUE (athlete_id, coach_id);


--
-- Name: athlete_medical uq_medical_athlete; Type: CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.athlete_medical
    ADD CONSTRAINT uq_medical_athlete UNIQUE (athlete_id);


--
-- Name: nutritionist_athlete_mapping uq_nutritionist_athlete; Type: CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.nutritionist_athlete_mapping
    ADD CONSTRAINT uq_nutritionist_athlete UNIQUE (athlete_id, nutritionist_id);


--
-- Name: nutritionist_athlete_mapping uq_nutritionist_athlete_map; Type: CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.nutritionist_athlete_mapping
    ADD CONSTRAINT uq_nutritionist_athlete_map UNIQUE (athlete_id, nutritionist_id);


--
-- Name: user_athlete_pins user_athlete_pins_pkey; Type: CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.user_athlete_pins
    ADD CONSTRAINT user_athlete_pins_pkey PRIMARY KEY (id);


--
-- Name: user_athlete_pins user_athlete_pins_user_id_athlete_id_key; Type: CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.user_athlete_pins
    ADD CONSTRAINT user_athlete_pins_user_id_athlete_id_key UNIQUE (user_id, athlete_id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verification_codes verification_codes_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.verification_codes
    ADD CONSTRAINT verification_codes_pkey PRIMARY KEY (id);


--
-- Name: nutrition_diagnosis_lookup nutrition_diagnosis_lookup_pkey; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.nutrition_diagnosis_lookup
    ADD CONSTRAINT nutrition_diagnosis_lookup_pkey PRIMARY KEY (id);


--
-- Name: open_item_status_lookup open_item_status_lookup_open_item_status_key; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.open_item_status_lookup
    ADD CONSTRAINT open_item_status_lookup_open_item_status_key UNIQUE (open_item_status);


--
-- Name: open_item_status_lookup open_item_status_lookup_pkey; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.open_item_status_lookup
    ADD CONSTRAINT open_item_status_lookup_pkey PRIMARY KEY (id);


--
-- Name: session_anthropometry session_anthropometry_pkey; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_anthropometry
    ADD CONSTRAINT session_anthropometry_pkey PRIMARY KEY (id);


--
-- Name: session_bowel_movement session_bowel_movement_pkey; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_bowel_movement
    ADD CONSTRAINT session_bowel_movement_pkey PRIMARY KEY (id);


--
-- Name: session_hydration session_hydration_pkey; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_hydration
    ADD CONSTRAINT session_hydration_pkey PRIMARY KEY (id);


--
-- Name: session_meal_log session_meal_log_pkey; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_meal_log
    ADD CONSTRAINT session_meal_log_pkey PRIMARY KEY (id);


--
-- Name: session_note session_note_pkey; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_note
    ADD CONSTRAINT session_note_pkey PRIMARY KEY (id);


--
-- Name: session_nutrition_review session_nutrition_review_pkey; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_nutrition_review
    ADD CONSTRAINT session_nutrition_review_pkey PRIMARY KEY (id);


--
-- Name: session_open_item session_open_item_pkey; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_open_item
    ADD CONSTRAINT session_open_item_pkey PRIMARY KEY (id);


--
-- Name: session_period session_period_pkey; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_period
    ADD CONSTRAINT session_period_pkey PRIMARY KEY (id);


--
-- Name: session_prescription session_prescription_pkey; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_prescription
    ADD CONSTRAINT session_prescription_pkey PRIMARY KEY (id);


--
-- Name: session_puberty session_puberty_pkey; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_puberty
    ADD CONSTRAINT session_puberty_pkey PRIMARY KEY (id);


--
-- Name: session_training_schedule session_training_schedule_pkey; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_training_schedule
    ADD CONSTRAINT session_training_schedule_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: type_of_consult_lookup type_of_consult_lookup_pkey; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.type_of_consult_lookup
    ADD CONSTRAINT type_of_consult_lookup_pkey PRIMARY KEY (id);


--
-- Name: type_of_consult_lookup type_of_consult_lookup_type_of_consult_key; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.type_of_consult_lookup
    ADD CONSTRAINT type_of_consult_lookup_type_of_consult_key UNIQUE (type_of_consult);


--
-- Name: nutrition_diagnosis_lookup uq_diagnosis_category; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.nutrition_diagnosis_lookup
    ADD CONSTRAINT uq_diagnosis_category UNIQUE (category, diagnosis);


--
-- Name: batch_stock_status_lookup batch_stock_status_lookup_batch_stock_status_key; Type: CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.batch_stock_status_lookup
    ADD CONSTRAINT batch_stock_status_lookup_batch_stock_status_key UNIQUE (batch_stock_status);


--
-- Name: batch_stock_status_lookup batch_stock_status_lookup_pkey; Type: CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.batch_stock_status_lookup
    ADD CONSTRAINT batch_stock_status_lookup_pkey PRIMARY KEY (id);


--
-- Name: inventory_batch inventory_batch_batch_number_key; Type: CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.inventory_batch
    ADD CONSTRAINT inventory_batch_batch_number_key UNIQUE (batch_number);


--
-- Name: inventory_batch inventory_batch_pkey; Type: CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.inventory_batch
    ADD CONSTRAINT inventory_batch_pkey PRIMARY KEY (id);


--
-- Name: inventory_ticket inventory_ticket_pkey; Type: CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.inventory_ticket
    ADD CONSTRAINT inventory_ticket_pkey PRIMARY KEY (id);


--
-- Name: supplement_packaging_form_lookup supplement_dose_form_lookup_pkey; Type: CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.supplement_packaging_form_lookup
    ADD CONSTRAINT supplement_dose_form_lookup_pkey PRIMARY KEY (id);


--
-- Name: supplement_packaging_form_lookup supplement_dose_form_lookup_supplement_dose_form_key; Type: CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.supplement_packaging_form_lookup
    ADD CONSTRAINT supplement_dose_form_lookup_supplement_dose_form_key UNIQUE (supplement_packaging_form);


--
-- Name: supplement supplement_pkey; Type: CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.supplement
    ADD CONSTRAINT supplement_pkey PRIMARY KEY (id);


--
-- Name: supplement_staging supplement_staging_pkey; Type: CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.supplement_staging
    ADD CONSTRAINT supplement_staging_pkey PRIMARY KEY (id);


--
-- Name: supplement_status_lookup supplement_status_lookup_pkey; Type: CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.supplement_status_lookup
    ADD CONSTRAINT supplement_status_lookup_pkey PRIMARY KEY (id);


--
-- Name: supplement_status_lookup supplement_status_lookup_supplement_status_key; Type: CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.supplement_status_lookup
    ADD CONSTRAINT supplement_status_lookup_supplement_status_key UNIQUE (supplement_status);


--
-- Name: ticket_status_lookup ticket_status_lookup_pkey; Type: CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.ticket_status_lookup
    ADD CONSTRAINT ticket_status_lookup_pkey PRIMARY KEY (id);


--
-- Name: ticket_status_lookup ticket_status_lookup_ticket_status_key; Type: CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.ticket_status_lookup
    ADD CONSTRAINT ticket_status_lookup_ticket_status_key UNIQUE (ticket_status);


--
-- Name: webscraper_catalog_url uq_webscraper_catalog_url; Type: CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.webscraper_catalog_url
    ADD CONSTRAINT uq_webscraper_catalog_url UNIQUE (product_catalog_website, number_of_catalog_page);


--
-- Name: webscraper_catalog_url webscraper_catalog_url_pkey; Type: CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.webscraper_catalog_url
    ADD CONSTRAINT webscraper_catalog_url_pkey PRIMARY KEY (id);


--
-- Name: idx_user_athlete_pins_athlete_id; Type: INDEX; Schema: ams; Owner: -
--

CREATE INDEX idx_user_athlete_pins_athlete_id ON ams.user_athlete_pins USING btree (athlete_id);


--
-- Name: idx_user_athlete_pins_is_pinned; Type: INDEX; Schema: ams; Owner: -
--

CREATE INDEX idx_user_athlete_pins_is_pinned ON ams.user_athlete_pins USING btree (is_pinned);


--
-- Name: idx_user_athlete_pins_user_id; Type: INDEX; Schema: ams; Owner: -
--

CREATE INDEX idx_user_athlete_pins_user_id ON ams.user_athlete_pins USING btree (user_id);


--
-- Name: idx_audit_record_id; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_audit_record_id ON audit.audit_log USING btree (record_id);


--
-- Name: idx_audit_table_name; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_audit_table_name ON audit.audit_log USING btree (table_name);


--
-- Name: idx_codes_user_purpose; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_codes_user_purpose ON auth.verification_codes USING btree (user_id, purpose);


--
-- Name: idx_users_email; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_email ON auth.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_role ON auth.users USING btree (role);


--
-- Name: idx_supplement_vector_100g; Type: INDEX; Schema: sss; Owner: -
--

CREATE INDEX idx_supplement_vector_100g ON sss.supplement USING ivfflat (vector_100g_ingredient public.vector_cosine_ops) WITH (lists='100');


--
-- Name: idx_supplement_vector_serving; Type: INDEX; Schema: sss; Owner: -
--

CREATE INDEX idx_supplement_vector_serving ON sss.supplement USING ivfflat (vector_perserving_ingredient public.vector_cosine_ops) WITH (lists='100');


--
-- Name: athlete audit_athlete_changes; Type: TRIGGER; Schema: ams; Owner: -
--

CREATE TRIGGER audit_athlete_changes AFTER INSERT OR DELETE OR UPDATE ON ams.athlete FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: coach audit_coach_changes; Type: TRIGGER; Schema: ams; Owner: -
--

CREATE TRIGGER audit_coach_changes AFTER INSERT OR DELETE OR UPDATE ON ams.coach FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: coach_athlete_mapping audit_coach_mapping_changes; Type: TRIGGER; Schema: ams; Owner: -
--

CREATE TRIGGER audit_coach_mapping_changes AFTER INSERT OR DELETE OR UPDATE ON ams.coach_athlete_mapping FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: athlete_medical audit_medical_changes; Type: TRIGGER; Schema: ams; Owner: -
--

CREATE TRIGGER audit_medical_changes AFTER INSERT OR DELETE OR UPDATE ON ams.athlete_medical FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: nutritionist audit_nutritionist_changes; Type: TRIGGER; Schema: ams; Owner: -
--

CREATE TRIGGER audit_nutritionist_changes AFTER INSERT OR DELETE OR UPDATE ON ams.nutritionist FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: nutritionist_athlete_mapping audit_nutritionist_mapping_changes; Type: TRIGGER; Schema: ams; Owner: -
--

CREATE TRIGGER audit_nutritionist_mapping_changes AFTER INSERT OR DELETE OR UPDATE ON ams.nutritionist_athlete_mapping FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: athlete_registry audit_registry_changes; Type: TRIGGER; Schema: ams; Owner: -
--

CREATE TRIGGER audit_registry_changes AFTER INSERT OR DELETE OR UPDATE ON ams.athlete_registry FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: sport_lookup audit_sport_lookup_changes; Type: TRIGGER; Schema: ams; Owner: -
--

CREATE TRIGGER audit_sport_lookup_changes AFTER INSERT OR DELETE OR UPDATE ON ams.sport_lookup FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: users audit_auth_users_changes; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER audit_auth_users_changes AFTER INSERT OR DELETE OR UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: verification_codes audit_verification_codes_changes; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER audit_verification_codes_changes AFTER INSERT OR DELETE OR UPDATE ON auth.verification_codes FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: session_anthropometry audit_anthropometry_changes; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER audit_anthropometry_changes AFTER INSERT OR DELETE OR UPDATE ON consultation.session_anthropometry FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: session_bowel_movement audit_bowel_changes; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER audit_bowel_changes AFTER INSERT OR DELETE OR UPDATE ON consultation.session_bowel_movement FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: type_of_consult_lookup audit_consult_type_changes; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER audit_consult_type_changes AFTER INSERT OR DELETE OR UPDATE ON consultation.type_of_consult_lookup FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: nutrition_diagnosis_lookup audit_diagnosis_lookup_changes; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER audit_diagnosis_lookup_changes AFTER INSERT OR DELETE OR UPDATE ON consultation.nutrition_diagnosis_lookup FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: session_hydration audit_hydration_changes; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER audit_hydration_changes AFTER INSERT OR DELETE OR UPDATE ON consultation.session_hydration FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: session_meal_log audit_meal_log_changes; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER audit_meal_log_changes AFTER INSERT OR DELETE OR UPDATE ON consultation.session_meal_log FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: session_note audit_note_changes; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER audit_note_changes AFTER INSERT OR DELETE OR UPDATE ON consultation.session_note FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: session_nutrition_review audit_nutrition_review_changes; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER audit_nutrition_review_changes AFTER INSERT OR DELETE OR UPDATE ON consultation.session_nutrition_review FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: session_open_item audit_open_item_changes; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER audit_open_item_changes AFTER INSERT OR DELETE OR UPDATE ON consultation.session_open_item FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: open_item_status_lookup audit_open_item_status_lookup_changes; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER audit_open_item_status_lookup_changes AFTER INSERT OR DELETE OR UPDATE ON consultation.open_item_status_lookup FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: session_period audit_period_changes; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER audit_period_changes AFTER INSERT OR DELETE OR UPDATE ON consultation.session_period FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: session_prescription audit_prescription_changes; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER audit_prescription_changes AFTER INSERT OR DELETE OR UPDATE ON consultation.session_prescription FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: session_puberty audit_puberty_changes; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER audit_puberty_changes AFTER INSERT OR DELETE OR UPDATE ON consultation.session_puberty FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: sessions audit_session_changes; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER audit_session_changes AFTER INSERT OR DELETE OR UPDATE ON consultation.sessions FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: session_training_schedule audit_training_changes; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER audit_training_changes AFTER INSERT OR DELETE OR UPDATE ON consultation.session_training_schedule FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: inventory_batch audit_inventory_batch_changes; Type: TRIGGER; Schema: sss; Owner: -
--

CREATE TRIGGER audit_inventory_batch_changes AFTER INSERT OR DELETE OR UPDATE ON sss.inventory_batch FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: inventory_ticket audit_inventory_ticket_changes; Type: TRIGGER; Schema: sss; Owner: -
--

CREATE TRIGGER audit_inventory_ticket_changes AFTER INSERT OR DELETE OR UPDATE ON sss.inventory_ticket FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: supplement_packaging_form_lookup audit_packaging_lookup_changes; Type: TRIGGER; Schema: sss; Owner: -
--

CREATE TRIGGER audit_packaging_lookup_changes AFTER INSERT OR DELETE OR UPDATE ON sss.supplement_packaging_form_lookup FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: batch_stock_status_lookup audit_stock_status_lookup_changes; Type: TRIGGER; Schema: sss; Owner: -
--

CREATE TRIGGER audit_stock_status_lookup_changes AFTER INSERT OR DELETE OR UPDATE ON sss.batch_stock_status_lookup FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: supplement audit_supplement_changes; Type: TRIGGER; Schema: sss; Owner: -
--

CREATE TRIGGER audit_supplement_changes AFTER INSERT OR DELETE OR UPDATE ON sss.supplement FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: supplement_staging audit_supplement_staging_changes; Type: TRIGGER; Schema: sss; Owner: -
--

CREATE TRIGGER audit_supplement_staging_changes AFTER INSERT OR DELETE OR UPDATE ON sss.supplement_staging FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: supplement_status_lookup audit_supplement_status_lookup_changes; Type: TRIGGER; Schema: sss; Owner: -
--

CREATE TRIGGER audit_supplement_status_lookup_changes AFTER INSERT OR DELETE OR UPDATE ON sss.supplement_status_lookup FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: ticket_status_lookup audit_ticket_status_lookup_changes; Type: TRIGGER; Schema: sss; Owner: -
--

CREATE TRIGGER audit_ticket_status_lookup_changes AFTER INSERT OR DELETE OR UPDATE ON sss.ticket_status_lookup FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: webscraper_catalog_url audit_webscraper_url_changes; Type: TRIGGER; Schema: sss; Owner: -
--

CREATE TRIGGER audit_webscraper_url_changes AFTER INSERT OR DELETE OR UPDATE ON sss.webscraper_catalog_url FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: athlete fk_athlete_sport; Type: FK CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.athlete
    ADD CONSTRAINT fk_athlete_sport FOREIGN KEY (sport_id) REFERENCES ams.sport_lookup(id);


--
-- Name: athlete fk_athlete_user; Type: FK CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.athlete
    ADD CONSTRAINT fk_athlete_user FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: coach fk_coach_sport; Type: FK CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.coach
    ADD CONSTRAINT fk_coach_sport FOREIGN KEY (sport_id) REFERENCES ams.sport_lookup(id);


--
-- Name: coach fk_coach_user; Type: FK CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.coach
    ADD CONSTRAINT fk_coach_user FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: nutritionist_athlete_mapping fk_map_athlete; Type: FK CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.nutritionist_athlete_mapping
    ADD CONSTRAINT fk_map_athlete FOREIGN KEY (athlete_id) REFERENCES ams.athlete(id) ON DELETE CASCADE;


--
-- Name: nutritionist_athlete_mapping fk_map_nutritionist; Type: FK CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.nutritionist_athlete_mapping
    ADD CONSTRAINT fk_map_nutritionist FOREIGN KEY (nutritionist_id) REFERENCES ams.nutritionist(id) ON DELETE CASCADE;


--
-- Name: coach_athlete_mapping fk_mapping_athlete; Type: FK CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.coach_athlete_mapping
    ADD CONSTRAINT fk_mapping_athlete FOREIGN KEY (athlete_id) REFERENCES ams.athlete(id) ON DELETE CASCADE;


--
-- Name: coach_athlete_mapping fk_mapping_coach; Type: FK CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.coach_athlete_mapping
    ADD CONSTRAINT fk_mapping_coach FOREIGN KEY (coach_id) REFERENCES ams.coach(id) ON DELETE CASCADE;


--
-- Name: athlete_medical fk_medical_athlete; Type: FK CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.athlete_medical
    ADD CONSTRAINT fk_medical_athlete FOREIGN KEY (athlete_id) REFERENCES ams.athlete(id) ON DELETE CASCADE;


--
-- Name: nutritionist fk_nutritionist_user; Type: FK CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.nutritionist
    ADD CONSTRAINT fk_nutritionist_user FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: athlete_registry fk_registry_athlete; Type: FK CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.athlete_registry
    ADD CONSTRAINT fk_registry_athlete FOREIGN KEY (athlete_id) REFERENCES ams.athlete(id) ON DELETE CASCADE;


--
-- Name: user_athlete_pins user_athlete_pins_athlete_id_fkey; Type: FK CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.user_athlete_pins
    ADD CONSTRAINT user_athlete_pins_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES ams.athlete(id) ON DELETE CASCADE;


--
-- Name: verification_codes fk_codes_user; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.verification_codes
    ADD CONSTRAINT fk_codes_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions fk_session_user; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.user_sessions
    ADD CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: session_anthropometry fk_anthro_session; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_anthropometry
    ADD CONSTRAINT fk_anthro_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;


--
-- Name: session_bowel_movement fk_bowel_session; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_bowel_movement
    ADD CONSTRAINT fk_bowel_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;


--
-- Name: session_hydration fk_hydration_session; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_hydration
    ADD CONSTRAINT fk_hydration_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;


--
-- Name: session_meal_log fk_meal_session; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_meal_log
    ADD CONSTRAINT fk_meal_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;


--
-- Name: session_note fk_note_calcium; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_note
    ADD CONSTRAINT fk_note_calcium FOREIGN KEY (calcium_review_id) REFERENCES consultation.nutrition_diagnosis_lookup(id);


--
-- Name: session_note fk_note_carbs; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_note
    ADD CONSTRAINT fk_note_carbs FOREIGN KEY (carbohydrates_review_id) REFERENCES consultation.nutrition_diagnosis_lookup(id);


--
-- Name: session_note fk_note_fat; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_note
    ADD CONSTRAINT fk_note_fat FOREIGN KEY (fat_review_id) REFERENCES consultation.nutrition_diagnosis_lookup(id);


--
-- Name: session_note fk_note_fibre; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_note
    ADD CONSTRAINT fk_note_fibre FOREIGN KEY (fibre_review_id) REFERENCES consultation.nutrition_diagnosis_lookup(id);


--
-- Name: session_note fk_note_iron; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_note
    ADD CONSTRAINT fk_note_iron FOREIGN KEY (iron_review_id) REFERENCES consultation.nutrition_diagnosis_lookup(id);


--
-- Name: session_note fk_note_micro; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_note
    ADD CONSTRAINT fk_note_micro FOREIGN KEY (micronutrients_review_id) REFERENCES consultation.nutrition_diagnosis_lookup(id);


--
-- Name: session_note fk_note_protein; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_note
    ADD CONSTRAINT fk_note_protein FOREIGN KEY (protein_review_id) REFERENCES consultation.nutrition_diagnosis_lookup(id);


--
-- Name: session_note fk_note_session; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_note
    ADD CONSTRAINT fk_note_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;


--
-- Name: session_open_item fk_open_item_session; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_open_item
    ADD CONSTRAINT fk_open_item_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;


--
-- Name: session_open_item fk_open_item_status; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_open_item
    ADD CONSTRAINT fk_open_item_status FOREIGN KEY (open_item_status_id) REFERENCES consultation.open_item_status_lookup(id);


--
-- Name: session_period fk_period_session; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_period
    ADD CONSTRAINT fk_period_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;


--
-- Name: session_prescription fk_prescription_batch; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_prescription
    ADD CONSTRAINT fk_prescription_batch FOREIGN KEY (batch_id) REFERENCES sss.inventory_batch(id);


--
-- Name: session_prescription fk_prescription_session; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_prescription
    ADD CONSTRAINT fk_prescription_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;


--
-- Name: session_puberty fk_puberty_session; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_puberty
    ADD CONSTRAINT fk_puberty_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;


--
-- Name: session_nutrition_review fk_review_session; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_nutrition_review
    ADD CONSTRAINT fk_review_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;


--
-- Name: sessions fk_session_athlete; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.sessions
    ADD CONSTRAINT fk_session_athlete FOREIGN KEY (athlete_id) REFERENCES ams.athlete(id) ON DELETE CASCADE;


--
-- Name: sessions fk_session_nutritionist; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.sessions
    ADD CONSTRAINT fk_session_nutritionist FOREIGN KEY (nutritionist_id) REFERENCES ams.nutritionist(id);


--
-- Name: sessions fk_session_type; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.sessions
    ADD CONSTRAINT fk_session_type FOREIGN KEY (type_of_consult_id) REFERENCES consultation.type_of_consult_lookup(id);


--
-- Name: session_training_schedule fk_training_session; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_training_schedule
    ADD CONSTRAINT fk_training_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;


--
-- Name: inventory_batch fk_batch_stock_status; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.inventory_batch
    ADD CONSTRAINT fk_batch_stock_status FOREIGN KEY (batch_stock_status_id) REFERENCES sss.batch_stock_status_lookup(id);


--
-- Name: inventory_batch fk_inventory_batch_supplement; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.inventory_batch
    ADD CONSTRAINT fk_inventory_batch_supplement FOREIGN KEY (supplement_id) REFERENCES sss.supplement(id);


--
-- Name: supplement_staging fk_staging_catalog_url; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.supplement_staging
    ADD CONSTRAINT fk_staging_catalog_url FOREIGN KEY (webscraper_catalog_url_id) REFERENCES sss.webscraper_catalog_url(id);


--
-- Name: supplement fk_supplement_approver; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.supplement
    ADD CONSTRAINT fk_supplement_approver FOREIGN KEY (approved_by) REFERENCES ams.nutritionist(id);


--
-- Name: supplement fk_supplement_dose_form; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.supplement
    ADD CONSTRAINT fk_supplement_dose_form FOREIGN KEY (supplement_packaging_form_id) REFERENCES sss.supplement_packaging_form_lookup(id);


--
-- Name: supplement_staging fk_supplement_staging_packaging_form; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.supplement_staging
    ADD CONSTRAINT fk_supplement_staging_packaging_form FOREIGN KEY (supplement_packaging_form_id) REFERENCES sss.supplement_packaging_form_lookup(id);


--
-- Name: supplement_staging fk_supplement_staging_status; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.supplement_staging
    ADD CONSTRAINT fk_supplement_staging_status FOREIGN KEY (supplement_status_id) REFERENCES sss.supplement_status_lookup(id);


--
-- Name: supplement fk_supplement_status; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.supplement
    ADD CONSTRAINT fk_supplement_status FOREIGN KEY (supplement_status_id) REFERENCES sss.supplement_status_lookup(id);


--
-- Name: inventory_ticket fk_ticket_inventory_batch; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.inventory_ticket
    ADD CONSTRAINT fk_ticket_inventory_batch FOREIGN KEY (inventory_batch_id) REFERENCES sss.inventory_batch(id);


--
-- Name: inventory_ticket fk_ticket_prescription; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.inventory_ticket
    ADD CONSTRAINT fk_ticket_prescription FOREIGN KEY (prescription_id) REFERENCES consultation.session_prescription(id) ON DELETE SET NULL;


--
-- Name: inventory_ticket fk_ticket_status; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.inventory_ticket
    ADD CONSTRAINT fk_ticket_status FOREIGN KEY (ticket_status_id) REFERENCES sss.ticket_status_lookup(id);


--
-- Name: supplement_staging supplement_staging_promoted_to_supplement_id_fkey; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.supplement_staging
    ADD CONSTRAINT supplement_staging_promoted_to_supplement_id_fkey FOREIGN KEY (promoted_to_supplement_id) REFERENCES sss.supplement(id);


--
-- PostgreSQL database dump complete
--

\unrestrict Mhbavvsvb6lEfgB7B8AjjOet8oRvobO5FVxmhbdpGWoWvSyfRrrQO3wS2D9Th3N

