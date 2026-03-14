--
-- PostgreSQL database dump
--

\restrict nqZOqpn2tzAiSdfPZh8yT7qWMYmdPGKfuTRRBppwxYvkn4aHmyjEUWuN5y7kL9V

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
    -- 1. Get the current user
    BEGIN
        current_app_user := current_setting('app.current_user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_app_user := NULL;
    END;

    -- 2. Handle Operations
    IF (TG_OP = 'INSERT') THEN
        record_id_val := NEW.id;
        old_data := NULL;
        new_data := to_jsonb(NEW);
        
    ELSIF (TG_OP = 'UPDATE') THEN
        -- *** THE FIX: Check if data actually changed ***
        -- If OLD and NEW are identical, stop here and return.
        IF NEW IS NOT DISTINCT FROM OLD THEN
            RETURN NEW;
        END IF;

        record_id_val := NEW.id;
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
    ELSIF (TG_OP = 'DELETE') THEN
        record_id_val := OLD.id;
        old_data := to_jsonb(OLD);
        new_data := NULL;
    END IF;

    -- 3. Insert Log
    INSERT INTO audit.audit_log (user_id, table_name, record_id, action, old_values, new_values)
    VALUES (current_app_user, TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME, record_id_val, TG_OP, old_data, new_data);

    IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;


--
-- Name: touch_parent_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_parent_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    parent_table text := TG_ARGV[0];
    parent_id_col text := TG_ARGV[1];
    child_fk_col text := TG_ARGV[2];
    fk_value uuid;
BEGIN
    -- 1. Grab the Foreign Key UUID from the row being changed
    IF (TG_OP = 'DELETE') THEN
        EXECUTE format('SELECT ($1).%I', child_fk_col) INTO fk_value USING OLD;
    ELSE
        EXECUTE format('SELECT ($1).%I', child_fk_col) INTO fk_value USING NEW;
    END IF;

    -- 2. Update the parent table's updated_at column
    IF fk_value IS NOT NULL THEN
        EXECUTE format('UPDATE %s SET updated_at = NOW() WHERE %I = $1', parent_table, parent_id_col) USING fk_value;
    END IF;

    IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$_$;


--
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- 1. Compare the OLD data vs the NEW data.
    -- "IS NOT DISTINCT FROM" is a safe way to compare everything, including NULLs.
    -- We assume that if the application sends data, NEW.updated_at matches OLD.updated_at
    -- (because the app usually doesn't send a new timestamp manually).
    
    IF ROW(NEW.*) IS NOT DISTINCT FROM ROW(OLD.*) THEN
        -- If data is identical, do NOT bump the timestamp.
        RETURN NEW;
    END IF;

    -- 2. If we are here, something changed! Update the timestamp.
    NEW.updated_at = NOW();
    RETURN NEW;
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
    sport_start_date integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT chk_athlete_gender CHECK ((gender = ANY (ARRAY['MALE'::text, 'FEMALE'::text, 'OTHER'::text]))),
    CONSTRAINT chk_range_0_99 CHECK (((sport_start_date >= 0) AND (sport_start_date <= 99)))
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
    dietary_restriction text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
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
    is_active boolean DEFAULT true
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
    changed_on timestamp with time zone DEFAULT CURRENT_TIMESTAMP
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
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['IT_ADMIN'::character varying, 'ADMIN'::character varying, 'NUTRITIONIST'::character varying, 'COACH'::character varying, 'ATHLETE'::character varying, 'DASHBOARD'::character varying])::text[])))
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
    date_recorded date,
    measured_by text,
    athlete_potential_adult_height integer,
    height_cm numeric(5,2),
    weight_kg numeric(5,2),
    target_weight_kg numeric(5,2),
    fat_mass_kg numeric(5,2),
    skeletal_muscle_mass_kg numeric(5,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
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
    other_remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
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
    other_remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
);


--
-- Name: session_meal; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.session_meal (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    sessions_id uuid NOT NULL,
    other_remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
);


--
-- Name: session_meal_log; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.session_meal_log (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    food_time time without time zone,
    meal_description text,
    lower_carbohydrate_g numeric(6,1),
    upper_carbohydrate_g numeric(6,1),
    lower_protein_g numeric(6,1),
    upper_protein_g numeric(6,1),
    lower_fat_g numeric(6,1),
    upper_fat_g numeric(6,1),
    session_meal_id uuid NOT NULL
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
    other_review text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    carbohydrates_review text,
    protein_review text,
    fat_review text
);


--
-- Name: session_nutrition_review; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.session_nutrition_review (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    sessions_id uuid NOT NULL,
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
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
    other_remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
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
    other_remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
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
    other_remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    prescriber text,
    prescription_date date DEFAULT CURRENT_DATE
);


--
-- Name: session_puberty; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.session_puberty (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    sessions_id uuid NOT NULL,
    period_of_growth_spurt text,
    other_remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
);


--
-- Name: session_sleep; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.session_sleep (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    sessions_id uuid NOT NULL,
    sleep_duration_h numeric(3,1),
    sleep_quality integer,
    other_remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT chk_sleep_quality_range CHECK (((sleep_quality >= 1) AND (sleep_quality <= 10)))
);


--
-- Name: session_training; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.session_training (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    sessions_id uuid NOT NULL,
    upcoming_major_competitions text,
    upcoming_local_competitions text,
    current_performance text,
    coach_performance_goals text,
    athlete_performance_goals text,
    other_remarks text,
    physical_activity_level_pal numeric(3,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    rpe_week integer,
    CONSTRAINT chk_rpe_week_range CHECK (((rpe_week >= 1) AND (rpe_week <= 10)))
);


--
-- Name: session_training_schedule; Type: TABLE; Schema: consultation; Owner: -
--

CREATE TABLE consultation.session_training_schedule (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    session_training_id uuid NOT NULL,
    day_of_week text NOT NULL,
    time_start time without time zone,
    time_end time without time zone,
    activity text,
    rpe integer,
    CONSTRAINT chk_day_of_week CHECK ((day_of_week = ANY (ARRAY['Monday'::text, 'Tuesday'::text, 'Wednesday'::text, 'Thursday'::text, 'Friday'::text, 'Saturday'::text, 'Sunday'::text]))),
    CONSTRAINT chk_rpe_range CHECK (((rpe >= 1) AND (rpe <= 10)))
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
    time_of_next_follow_up time without time zone,
    is_scheduled_booking boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    status character varying(20) DEFAULT 'scheduled'::character varying NOT NULL,
    CONSTRAINT sessions_status_check CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'in-progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: COLUMN sessions.is_scheduled_booking; Type: COMMENT; Schema: consultation; Owner: -
--

COMMENT ON COLUMN consultation.sessions.is_scheduled_booking IS 'TRUE if this session was booked via the dashboard scheduling flow. FALSE (default) if created ad-hoc from the ConsultationView.';


--
-- Name: COLUMN sessions.status; Type: COMMENT; Schema: consultation; Owner: -
--

COMMENT ON COLUMN consultation.sessions.status IS 'Lifecycle status: scheduled, in-progress, completed, cancelled';


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
-- Name: batch_testing_org_lookup; Type: TABLE; Schema: sss; Owner: -
--

CREATE TABLE sss.batch_testing_org_lookup (
    id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    batch_testing_org text NOT NULL,
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
    batch_stock_status_id uuid NOT NULL,
    date_added date DEFAULT CURRENT_DATE NOT NULL,
    inv_batch_testing_org text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    batch_unit character varying(50),
    inv_batch_testing_org_id uuid
);


--
-- Name: COLUMN inventory_batch.batch_unit; Type: COMMENT; Schema: sss; Owner: -
--

COMMENT ON COLUMN sss.inventory_batch.batch_unit IS 'Unit of measurement for the inventory batch (e.g., bottles, capsules, servings, grams, etc.)';


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
    vector_perserving_ingredient public.vector(384),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    batch_testing_org_id uuid
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
    promoted_to_supplement_id uuid,
    batch_testing_org_id uuid
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
-- Name: session_meal session_meal_pkey; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_meal
    ADD CONSTRAINT session_meal_pkey PRIMARY KEY (id);


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
-- Name: session_sleep session_sleep_pkey; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_sleep
    ADD CONSTRAINT session_sleep_pkey PRIMARY KEY (id);


--
-- Name: session_training session_training_schedule_pkey; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_training
    ADD CONSTRAINT session_training_schedule_pkey PRIMARY KEY (id);


--
-- Name: session_training_schedule session_training_schedule_pkey1; Type: CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_training_schedule
    ADD CONSTRAINT session_training_schedule_pkey1 PRIMARY KEY (id);


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
-- Name: batch_testing_org_lookup batch_testing_org_lookup_batch_testing_org_key; Type: CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.batch_testing_org_lookup
    ADD CONSTRAINT batch_testing_org_lookup_batch_testing_org_key UNIQUE (batch_testing_org);


--
-- Name: batch_testing_org_lookup batch_testing_org_lookup_pkey; Type: CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.batch_testing_org_lookup
    ADD CONSTRAINT batch_testing_org_lookup_pkey PRIMARY KEY (id);


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
-- Name: user_athlete_pins audit_user_athlete_pins_changes; Type: TRIGGER; Schema: ams; Owner: -
--

CREATE TRIGGER audit_user_athlete_pins_changes AFTER INSERT OR DELETE OR UPDATE ON ams.user_athlete_pins FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: athlete set_timestamp_athlete; Type: TRIGGER; Schema: ams; Owner: -
--

CREATE TRIGGER set_timestamp_athlete BEFORE UPDATE ON ams.athlete FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: athlete_medical set_timestamp_athlete_medical; Type: TRIGGER; Schema: ams; Owner: -
--

CREATE TRIGGER set_timestamp_athlete_medical BEFORE UPDATE ON ams.athlete_medical FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: athlete_registry set_timestamp_athlete_registry; Type: TRIGGER; Schema: ams; Owner: -
--

CREATE TRIGGER set_timestamp_athlete_registry BEFORE UPDATE ON ams.athlete_registry FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: user_athlete_pins set_timestamp_pins; Type: TRIGGER; Schema: ams; Owner: -
--

CREATE TRIGGER set_timestamp_pins BEFORE UPDATE ON ams.user_athlete_pins FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


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
-- Name: session_meal audit_session_meal_changes; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER audit_session_meal_changes AFTER INSERT OR DELETE OR UPDATE ON consultation.session_meal FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: session_sleep audit_session_sleep_changes; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER audit_session_sleep_changes AFTER INSERT OR DELETE OR UPDATE ON consultation.session_sleep FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: session_training_schedule audit_session_training_schedule_changes; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER audit_session_training_schedule_changes AFTER INSERT OR DELETE OR UPDATE ON consultation.session_training_schedule FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: session_training audit_training_changes; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER audit_training_changes AFTER INSERT OR DELETE OR UPDATE ON consultation.session_training FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


--
-- Name: session_note set_timestamp_note; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER set_timestamp_note BEFORE UPDATE ON consultation.session_note FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: session_open_item set_timestamp_open_item; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER set_timestamp_open_item BEFORE UPDATE ON consultation.session_open_item FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: session_prescription set_timestamp_prescription; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER set_timestamp_prescription BEFORE UPDATE ON consultation.session_prescription FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: session_anthropometry set_timestamp_session_anthropometry; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER set_timestamp_session_anthropometry BEFORE UPDATE ON consultation.session_anthropometry FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: session_bowel_movement set_timestamp_session_bowel_movement; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER set_timestamp_session_bowel_movement BEFORE UPDATE ON consultation.session_bowel_movement FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: session_hydration set_timestamp_session_hydration; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER set_timestamp_session_hydration BEFORE UPDATE ON consultation.session_hydration FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: session_meal set_timestamp_session_meal; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER set_timestamp_session_meal BEFORE UPDATE ON consultation.session_meal FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: session_nutrition_review set_timestamp_session_nutrition_review; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER set_timestamp_session_nutrition_review BEFORE UPDATE ON consultation.session_nutrition_review FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: session_period set_timestamp_session_period; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER set_timestamp_session_period BEFORE UPDATE ON consultation.session_period FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: session_puberty set_timestamp_session_puberty; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER set_timestamp_session_puberty BEFORE UPDATE ON consultation.session_puberty FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: session_sleep set_timestamp_session_sleep; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER set_timestamp_session_sleep BEFORE UPDATE ON consultation.session_sleep FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: session_training set_timestamp_session_training; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER set_timestamp_session_training BEFORE UPDATE ON consultation.session_training FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: sessions set_timestamp_sessions; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER set_timestamp_sessions BEFORE UPDATE ON consultation.sessions FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: session_meal_log touch_session_meal_on_log_change; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER touch_session_meal_on_log_change AFTER INSERT OR DELETE OR UPDATE ON consultation.session_meal_log FOR EACH ROW EXECUTE FUNCTION public.touch_parent_timestamp('consultation.session_meal', 'id', 'session_meal_id');


--
-- Name: session_anthropometry touch_session_on_anthropometry_change; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER touch_session_on_anthropometry_change AFTER INSERT OR DELETE OR UPDATE ON consultation.session_anthropometry FOR EACH ROW EXECUTE FUNCTION public.touch_parent_timestamp('consultation.sessions', 'id', 'sessions_id');


--
-- Name: session_bowel_movement touch_session_on_bowel_movement_change; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER touch_session_on_bowel_movement_change AFTER INSERT OR DELETE OR UPDATE ON consultation.session_bowel_movement FOR EACH ROW EXECUTE FUNCTION public.touch_parent_timestamp('consultation.sessions', 'id', 'sessions_id');


--
-- Name: session_hydration touch_session_on_hydration_change; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER touch_session_on_hydration_change AFTER INSERT OR DELETE OR UPDATE ON consultation.session_hydration FOR EACH ROW EXECUTE FUNCTION public.touch_parent_timestamp('consultation.sessions', 'id', 'sessions_id');


--
-- Name: session_meal touch_session_on_meal_change; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER touch_session_on_meal_change AFTER INSERT OR DELETE OR UPDATE ON consultation.session_meal FOR EACH ROW EXECUTE FUNCTION public.touch_parent_timestamp('consultation.sessions', 'id', 'sessions_id');


--
-- Name: session_note touch_session_on_note_change; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER touch_session_on_note_change AFTER INSERT OR DELETE OR UPDATE ON consultation.session_note FOR EACH ROW EXECUTE FUNCTION public.touch_parent_timestamp('consultation.sessions', 'id', 'sessions_id');


--
-- Name: session_nutrition_review touch_session_on_nutrition_review_change; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER touch_session_on_nutrition_review_change AFTER INSERT OR DELETE OR UPDATE ON consultation.session_nutrition_review FOR EACH ROW EXECUTE FUNCTION public.touch_parent_timestamp('consultation.sessions', 'id', 'sessions_id');


--
-- Name: session_open_item touch_session_on_open_item_change; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER touch_session_on_open_item_change AFTER INSERT OR DELETE OR UPDATE ON consultation.session_open_item FOR EACH ROW EXECUTE FUNCTION public.touch_parent_timestamp('consultation.sessions', 'id', 'sessions_id');


--
-- Name: session_period touch_session_on_period_change; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER touch_session_on_period_change AFTER INSERT OR DELETE OR UPDATE ON consultation.session_period FOR EACH ROW EXECUTE FUNCTION public.touch_parent_timestamp('consultation.sessions', 'id', 'sessions_id');


--
-- Name: session_prescription touch_session_on_prescription_change; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER touch_session_on_prescription_change AFTER INSERT OR DELETE OR UPDATE ON consultation.session_prescription FOR EACH ROW EXECUTE FUNCTION public.touch_parent_timestamp('consultation.sessions', 'id', 'sessions_id');


--
-- Name: session_puberty touch_session_on_puberty_change; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER touch_session_on_puberty_change AFTER INSERT OR DELETE OR UPDATE ON consultation.session_puberty FOR EACH ROW EXECUTE FUNCTION public.touch_parent_timestamp('consultation.sessions', 'id', 'sessions_id');


--
-- Name: session_sleep touch_session_on_sleep_change; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER touch_session_on_sleep_change AFTER INSERT OR DELETE OR UPDATE ON consultation.session_sleep FOR EACH ROW EXECUTE FUNCTION public.touch_parent_timestamp('consultation.sessions', 'id', 'sessions_id');


--
-- Name: session_training touch_session_on_training_change; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER touch_session_on_training_change AFTER INSERT OR DELETE OR UPDATE ON consultation.session_training FOR EACH ROW EXECUTE FUNCTION public.touch_parent_timestamp('consultation.sessions', 'id', 'sessions_id');


--
-- Name: session_training_schedule touch_session_training_on_schedule_change; Type: TRIGGER; Schema: consultation; Owner: -
--

CREATE TRIGGER touch_session_training_on_schedule_change AFTER INSERT OR DELETE OR UPDATE ON consultation.session_training_schedule FOR EACH ROW EXECUTE FUNCTION public.touch_parent_timestamp('consultation.session_training', 'id', 'session_training_id');


--
-- Name: batch_testing_org_lookup audit_batch_testing_org_lookup_changes; Type: TRIGGER; Schema: sss; Owner: -
--

CREATE TRIGGER audit_batch_testing_org_lookup_changes AFTER INSERT OR DELETE OR UPDATE ON sss.batch_testing_org_lookup FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();


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
-- Name: inventory_batch set_timestamp_inventory_batch; Type: TRIGGER; Schema: sss; Owner: -
--

CREATE TRIGGER set_timestamp_inventory_batch BEFORE UPDATE ON sss.inventory_batch FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: supplement set_timestamp_supplement; Type: TRIGGER; Schema: sss; Owner: -
--

CREATE TRIGGER set_timestamp_supplement BEFORE UPDATE ON sss.supplement FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: athlete athlete_created_by_fkey; Type: FK CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.athlete
    ADD CONSTRAINT athlete_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: athlete_medical athlete_medical_created_by_fkey; Type: FK CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.athlete_medical
    ADD CONSTRAINT athlete_medical_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: athlete_medical athlete_medical_updated_by_fkey; Type: FK CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.athlete_medical
    ADD CONSTRAINT athlete_medical_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: athlete_registry athlete_registry_created_by_fkey; Type: FK CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.athlete_registry
    ADD CONSTRAINT athlete_registry_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: athlete_registry athlete_registry_updated_by_fkey; Type: FK CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.athlete_registry
    ADD CONSTRAINT athlete_registry_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: athlete athlete_updated_by_fkey; Type: FK CONSTRAINT; Schema: ams; Owner: -
--

ALTER TABLE ONLY ams.athlete
    ADD CONSTRAINT athlete_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


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
-- Name: session_training fk_training_session; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_training
    ADD CONSTRAINT fk_training_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;


--
-- Name: session_anthropometry session_anthropometry_created_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_anthropometry
    ADD CONSTRAINT session_anthropometry_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: session_anthropometry session_anthropometry_updated_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_anthropometry
    ADD CONSTRAINT session_anthropometry_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: session_bowel_movement session_bowel_movement_created_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_bowel_movement
    ADD CONSTRAINT session_bowel_movement_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: session_bowel_movement session_bowel_movement_updated_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_bowel_movement
    ADD CONSTRAINT session_bowel_movement_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: session_hydration session_hydration_created_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_hydration
    ADD CONSTRAINT session_hydration_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: session_hydration session_hydration_updated_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_hydration
    ADD CONSTRAINT session_hydration_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: session_meal session_meal_created_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_meal
    ADD CONSTRAINT session_meal_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: session_meal_log session_meal_log_session_meal_id_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_meal_log
    ADD CONSTRAINT session_meal_log_session_meal_id_fkey FOREIGN KEY (session_meal_id) REFERENCES consultation.session_meal(id) ON DELETE CASCADE;


--
-- Name: session_meal session_meal_sessions_id_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_meal
    ADD CONSTRAINT session_meal_sessions_id_fkey FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;


--
-- Name: session_meal session_meal_updated_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_meal
    ADD CONSTRAINT session_meal_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: session_note session_note_created_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_note
    ADD CONSTRAINT session_note_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: session_note session_note_updated_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_note
    ADD CONSTRAINT session_note_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: session_nutrition_review session_nutrition_review_created_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_nutrition_review
    ADD CONSTRAINT session_nutrition_review_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: session_nutrition_review session_nutrition_review_updated_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_nutrition_review
    ADD CONSTRAINT session_nutrition_review_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: session_open_item session_open_item_created_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_open_item
    ADD CONSTRAINT session_open_item_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: session_open_item session_open_item_updated_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_open_item
    ADD CONSTRAINT session_open_item_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: session_period session_period_created_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_period
    ADD CONSTRAINT session_period_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: session_period session_period_updated_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_period
    ADD CONSTRAINT session_period_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: session_prescription session_prescription_created_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_prescription
    ADD CONSTRAINT session_prescription_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: session_prescription session_prescription_updated_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_prescription
    ADD CONSTRAINT session_prescription_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: session_puberty session_puberty_created_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_puberty
    ADD CONSTRAINT session_puberty_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: session_puberty session_puberty_updated_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_puberty
    ADD CONSTRAINT session_puberty_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: session_sleep session_sleep_created_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_sleep
    ADD CONSTRAINT session_sleep_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: session_sleep session_sleep_sessions_id_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_sleep
    ADD CONSTRAINT session_sleep_sessions_id_fkey FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;


--
-- Name: session_sleep session_sleep_updated_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_sleep
    ADD CONSTRAINT session_sleep_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: session_training session_training_created_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_training
    ADD CONSTRAINT session_training_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: session_training_schedule session_training_schedule_session_training_id_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_training_schedule
    ADD CONSTRAINT session_training_schedule_session_training_id_fkey FOREIGN KEY (session_training_id) REFERENCES consultation.session_training(id) ON DELETE CASCADE;


--
-- Name: session_training session_training_updated_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.session_training
    ADD CONSTRAINT session_training_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: sessions sessions_created_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.sessions
    ADD CONSTRAINT sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: sessions sessions_updated_by_fkey; Type: FK CONSTRAINT; Schema: consultation; Owner: -
--

ALTER TABLE ONLY consultation.sessions
    ADD CONSTRAINT sessions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


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
    ADD CONSTRAINT fk_ticket_prescription FOREIGN KEY (prescription_id) REFERENCES consultation.session_prescription(id) ON DELETE CASCADE;


--
-- Name: inventory_ticket fk_ticket_status; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.inventory_ticket
    ADD CONSTRAINT fk_ticket_status FOREIGN KEY (ticket_status_id) REFERENCES sss.ticket_status_lookup(id);


--
-- Name: inventory_batch inventory_batch_created_by_fkey; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.inventory_batch
    ADD CONSTRAINT inventory_batch_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: inventory_batch inventory_batch_inv_batch_testing_org_id_fkey; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.inventory_batch
    ADD CONSTRAINT inventory_batch_inv_batch_testing_org_id_fkey FOREIGN KEY (inv_batch_testing_org_id) REFERENCES sss.batch_testing_org_lookup(id);


--
-- Name: inventory_batch inventory_batch_updated_by_fkey; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.inventory_batch
    ADD CONSTRAINT inventory_batch_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: supplement supplement_batch_testing_org_id_fkey; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.supplement
    ADD CONSTRAINT supplement_batch_testing_org_id_fkey FOREIGN KEY (batch_testing_org_id) REFERENCES sss.batch_testing_org_lookup(id);


--
-- Name: supplement supplement_created_by_fkey; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.supplement
    ADD CONSTRAINT supplement_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: supplement_staging supplement_staging_batch_testing_org_id_fkey; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.supplement_staging
    ADD CONSTRAINT supplement_staging_batch_testing_org_id_fkey FOREIGN KEY (batch_testing_org_id) REFERENCES sss.batch_testing_org_lookup(id);


--
-- Name: supplement_staging supplement_staging_promoted_to_supplement_id_fkey; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.supplement_staging
    ADD CONSTRAINT supplement_staging_promoted_to_supplement_id_fkey FOREIGN KEY (promoted_to_supplement_id) REFERENCES sss.supplement(id) ON DELETE SET NULL;


--
-- Name: supplement supplement_updated_by_fkey; Type: FK CONSTRAINT; Schema: sss; Owner: -
--

ALTER TABLE ONLY sss.supplement
    ADD CONSTRAINT supplement_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict nqZOqpn2tzAiSdfPZh8yT7qWMYmdPGKfuTRRBppwxYvkn4aHmyjEUWuN5y7kL9V

