BEGIN;

-- ========================================================
-- 1. SETUP SCHEMA & LOGGING TABLE
-- ========================================================

CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE audit.audit_log (
    id UUID DEFAULT public.uuid_generate_v7() PRIMARY KEY,
    user_id UUID,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_values JSONB, 
    new_values JSONB, 
    changed_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_audit_record_id ON audit.audit_log(record_id);
CREATE INDEX idx_audit_table_name ON audit.audit_log(table_name);

-- ========================================================
-- 2. THE MASTER TRIGGER FUNCTION
-- ========================================================

CREATE OR REPLACE FUNCTION audit.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    current_app_user UUID;
    record_id_val UUID;
    old_data JSONB;
    new_data JSONB;
BEGIN
    -- Attempt to get User ID (Will be NULL if Auth isn't set up yet)
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
$$ LANGUAGE plpgsql;

-- ========================================================
-- 3. ATTACH TRIGGERS (SSS SCHEMA)
-- ========================================================

CREATE TRIGGER audit_supplement_staging_changes
AFTER INSERT OR UPDATE OR DELETE ON sss.supplement_staging
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_supplement_changes
AFTER INSERT OR UPDATE OR DELETE ON sss.supplement
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_inventory_batch_changes
AFTER INSERT OR UPDATE OR DELETE ON sss.inventory_batch
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_inventory_ticket_changes
AFTER INSERT OR UPDATE OR DELETE ON sss.inventory_ticket
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_webscraper_url_changes
AFTER INSERT OR UPDATE OR DELETE ON sss.webscraper_catalog_url
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

-- ========================================================
-- 4. ATTACH TRIGGERS (AMS SCHEMA)
-- ========================================================

CREATE TRIGGER audit_nutritionist_changes 
AFTER INSERT OR UPDATE OR DELETE ON ams.nutritionist 
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_coach_changes 
AFTER INSERT OR UPDATE OR DELETE ON ams.coach 
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_athlete_changes 
AFTER INSERT OR UPDATE OR DELETE ON ams.athlete 
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

-- Renamed for clarity (was 'audit_mapping_changes')
CREATE TRIGGER audit_coach_mapping_changes 
AFTER INSERT OR UPDATE OR DELETE ON ams.coach_athlete_mapping 
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_registry_changes
AFTER INSERT OR UPDATE OR DELETE ON ams.athlete_registry
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_medical_changes
AFTER INSERT OR UPDATE OR DELETE ON ams.athlete_medical
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

-- Renamed for clarity (was 'audit_mapping_changes')
CREATE TRIGGER audit_nutritionist_mapping_changes
AFTER INSERT OR UPDATE OR DELETE ON ams.nutritionist_athlete_mapping
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

-- ========================================================
-- 5. ATTACH TRIGGERS (CONSULTATION SCHEMA)
-- ========================================================

CREATE TRIGGER audit_consult_type_changes
AFTER INSERT OR UPDATE OR DELETE ON consultation.type_of_consult_lookup
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_session_changes
AFTER INSERT OR UPDATE OR DELETE ON consultation.sessions
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_open_item_changes 
AFTER INSERT OR UPDATE OR DELETE ON consultation.session_open_item 
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_prescription_changes 
AFTER INSERT OR UPDATE OR DELETE ON consultation.session_prescription 
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_anthropometry_changes 
AFTER INSERT OR UPDATE OR DELETE ON consultation.session_anthropometry 
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_training_changes 
AFTER INSERT OR UPDATE OR DELETE ON consultation.session_training_schedule 
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_meal_log_changes 
AFTER INSERT OR UPDATE OR DELETE ON consultation.session_meal_log 
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_note_changes 
AFTER INSERT OR UPDATE OR DELETE ON consultation.session_note 
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_nutrition_review_changes 
AFTER INSERT OR UPDATE OR DELETE ON consultation.session_nutrition_review 
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_period_changes 
AFTER INSERT OR UPDATE OR DELETE ON consultation.session_period 
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_puberty_changes 
AFTER INSERT OR UPDATE OR DELETE ON consultation.session_puberty 
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_bowel_changes 
AFTER INSERT OR UPDATE OR DELETE ON consultation.session_bowel_movement 
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_hydration_changes 
AFTER INSERT OR UPDATE OR DELETE ON consultation.session_hydration 
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

COMMIT;





BEGIN;

-- ========================================================
-- SSS LOOKUPS (Logistics)
-- ========================================================

CREATE TRIGGER audit_packaging_lookup_changes
AFTER INSERT OR UPDATE OR DELETE ON sss.supplement_packaging_form_lookup
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_ticket_status_lookup_changes
AFTER INSERT OR UPDATE OR DELETE ON sss.ticket_status_lookup
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_stock_status_lookup_changes
AFTER INSERT OR UPDATE OR DELETE ON sss.batch_stock_status_lookup
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_supplement_status_lookup_changes
AFTER INSERT OR UPDATE OR DELETE ON sss.supplement_status_lookup
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

-- ========================================================
-- AMS LOOKUPS (Sports)
-- ========================================================

CREATE TRIGGER audit_sport_lookup_changes
AFTER INSERT OR UPDATE OR DELETE ON ams.sport_lookup
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

-- ========================================================
-- CONSULTATION LOOKUPS (Workflow)
-- ========================================================

-- Note: You already had 'type_of_consult_lookup' in your previous script.
-- These are the remaining two:

CREATE TRIGGER audit_open_item_status_lookup_changes
AFTER INSERT OR UPDATE OR DELETE ON consultation.open_item_status_lookup
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_intervention_status_lookup_changes
AFTER INSERT OR UPDATE OR DELETE ON consultation.intervention_status_lookup
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

COMMIT;