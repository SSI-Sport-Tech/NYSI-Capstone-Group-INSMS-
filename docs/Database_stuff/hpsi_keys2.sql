BEGIN;

-- ========================================================
-- 1. SSS (Logistics) Constraints
-- ========================================================

-- Supplement -> Packaging
ALTER TABLE sss.supplement
ADD CONSTRAINT fk_supplement_packaging_form
FOREIGN KEY (supplement_packaging_form_id)
REFERENCES sss.supplement_packaging_form_lookup(id);

-- Supplement -> Status
ALTER TABLE sss.supplement 
ADD CONSTRAINT fk_supplement_status
FOREIGN KEY (supplement_status_id)
REFERENCES sss.supplement_status_lookup(id);

-- Supplement -> Nutritionist (Approver) - Keeping 'approved_by' as requested
ALTER TABLE sss.supplement
ADD CONSTRAINT fk_supplement_approver
FOREIGN KEY (approved_by) 
REFERENCES ams.nutritionist(id);

-- Staging -> Packaging
ALTER TABLE sss.supplement_staging
ADD CONSTRAINT fk_supplement_staging_packaging_form
FOREIGN KEY (supplement_packaging_form_id)
REFERENCES sss.supplement_packaging_form_lookup(id);

-- Staging -> Status
ALTER TABLE sss.supplement_staging 
ADD CONSTRAINT fk_supplement_staging_status
FOREIGN KEY (supplement_status_id)
REFERENCES sss.supplement_status_lookup(id);

-- Staging -> Catalog URL
ALTER TABLE sss.supplement_staging
ADD CONSTRAINT fk_staging_catalog_url
FOREIGN KEY (webscraper_catalog_url_id)
REFERENCES sss.webscraper_catalog_url(id);

-- Staging -> Supplement (Promotion Link)
ALTER TABLE sss.supplement_staging 
ADD CONSTRAINT fk_supplement_staging
FOREIGN KEY (promoted_to_supplement_id) -- Parentheses Fixed ✅
REFERENCES sss.supplement(id);

-- Inventory Batch -> Supplement
ALTER TABLE sss.inventory_batch
ADD CONSTRAINT fk_inventory_batch_supplement
FOREIGN KEY (supplement_id)
REFERENCES sss.supplement(id);

-- Inventory Batch -> Stock Status
ALTER TABLE sss.inventory_batch 
ADD CONSTRAINT fk_batch_stock_status
FOREIGN KEY (batch_stock_status_id)
REFERENCES sss.batch_stock_status_lookup(id);

-- Inventory Ticket -> Batch
ALTER TABLE sss.inventory_ticket
ADD CONSTRAINT fk_ticket_inventory_batch
FOREIGN KEY (inventory_batch_id)
REFERENCES sss.inventory_batch(id);

-- Inventory Ticket -> Status
ALTER TABLE sss.inventory_ticket
ADD CONSTRAINT fk_ticket_status
FOREIGN KEY (ticket_status_id)
REFERENCES sss.ticket_status_lookup(id);

-- ========================================================
-- 2. AMS (People) Constraints
-- ========================================================

-- Coach -> Sport
ALTER TABLE ams.coach
    ADD CONSTRAINT fk_coach_sport 
    FOREIGN KEY (sport_id) 
    REFERENCES ams.sport_lookup(id);

-- Athlete -> Sport
ALTER TABLE ams.athlete
    ADD CONSTRAINT fk_athlete_sport 
    FOREIGN KEY (sport_id) 
    REFERENCES ams.sport_lookup(id);

-- Registry -> Athlete
ALTER TABLE ams.athlete_registry
    ADD CONSTRAINT fk_registry_athlete 
    FOREIGN KEY (athlete_id) 
    REFERENCES ams.athlete(id) 
    ON DELETE CASCADE;

-- Medical -> Athlete
ALTER TABLE ams.athlete_medical
    ADD CONSTRAINT fk_medical_athlete 
    FOREIGN KEY (athlete_id) 
    REFERENCES ams.athlete(id) 
    ON DELETE CASCADE;

-- Coach Mapping -> Athlete
ALTER TABLE ams.coach_athlete_mapping
    ADD CONSTRAINT fk_mapping_athlete 
    FOREIGN KEY (athlete_id) 
    REFERENCES ams.athlete(id) 
    ON DELETE CASCADE;

-- Coach Mapping -> Coach
ALTER TABLE ams.coach_athlete_mapping
    ADD CONSTRAINT fk_mapping_coach 
    FOREIGN KEY (coach_id) 
    REFERENCES ams.coach(id) 
    ON DELETE CASCADE;

-- Nutritionist Mapping -> Nutritionist
ALTER TABLE ams.nutritionist_athlete_mapping
    ADD CONSTRAINT fk_map_nutritionist 
    FOREIGN KEY (nutritionist_id) 
    REFERENCES ams.nutritionist(id) 
    ON DELETE CASCADE;

-- Nutritionist Mapping -> Athlete
ALTER TABLE ams.nutritionist_athlete_mapping
    ADD CONSTRAINT fk_map_athlete 
    FOREIGN KEY (athlete_id) 
    REFERENCES ams.athlete(id) 
    ON DELETE CASCADE;

-- ========================================================
-- 3. Consultation (Work) Constraints
-- ========================================================

-- Session -> Nutritionist
ALTER TABLE consultation.sessions
    ADD CONSTRAINT fk_session_nutritionist 
    FOREIGN KEY (nutritionist_id) 
    REFERENCES ams.nutritionist(id);

-- Session -> Athlete
ALTER TABLE consultation.sessions
    ADD CONSTRAINT fk_session_athlete 
    FOREIGN KEY (athlete_id) 
    REFERENCES ams.athlete(id)
    ON DELETE CASCADE;

-- Session -> Type Lookup
ALTER TABLE consultation.sessions
    ADD CONSTRAINT fk_session_type 
    FOREIGN KEY (type_of_consult_id) 
    REFERENCES consultation.type_of_consult_lookup(id);

-- Open Item -> Status
ALTER TABLE consultation.session_open_item
ADD CONSTRAINT fk_open_item_status FOREIGN KEY (open_item_status_id) 
REFERENCES consultation.open_item_status_lookup(id);

-- Prescription -> Status
ALTER TABLE consultation.session_prescription
ADD CONSTRAINT fk_prescription_status FOREIGN KEY (intervention_status_id) 
REFERENCES consultation.intervention_status_lookup(id);

-- Prescription -> SSS Inventory Batch
ALTER TABLE consultation.session_prescription
ADD CONSTRAINT fk_prescription_batch FOREIGN KEY (batch_id) 
REFERENCES sss.inventory_batch(id);

-- Inventory Ticket -> Prescription (Closing the Loop)
ALTER TABLE sss.inventory_ticket
ADD CONSTRAINT fk_ticket_prescription
FOREIGN KEY (prescription_id) 
REFERENCES consultation.session_prescription(id)
ON DELETE SET NULL; 

-- ========================================================
-- 4. Consultation Child Tables (Session Links)
-- ========================================================

ALTER TABLE consultation.session_open_item ADD CONSTRAINT fk_open_item_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;
ALTER TABLE consultation.session_prescription ADD CONSTRAINT fk_prescription_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;
ALTER TABLE consultation.session_anthropometry ADD CONSTRAINT fk_anthro_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;
ALTER TABLE consultation.session_training_schedule ADD CONSTRAINT fk_training_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;
ALTER TABLE consultation.session_meal_log ADD CONSTRAINT fk_meal_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;
ALTER TABLE consultation.session_note ADD CONSTRAINT fk_note_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;
ALTER TABLE consultation.session_nutrition_review ADD CONSTRAINT fk_review_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;
ALTER TABLE consultation.session_period ADD CONSTRAINT fk_period_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;
ALTER TABLE consultation.session_puberty ADD CONSTRAINT fk_puberty_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;
ALTER TABLE consultation.session_bowel_movement ADD CONSTRAINT fk_bowel_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;
ALTER TABLE consultation.session_hydration ADD CONSTRAINT fk_hydration_session FOREIGN KEY (sessions_id) REFERENCES consultation.sessions(id) ON DELETE CASCADE;

COMMIT;