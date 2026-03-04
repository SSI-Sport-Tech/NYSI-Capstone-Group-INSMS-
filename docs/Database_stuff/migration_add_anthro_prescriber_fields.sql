-- Migration: Add date_recorded + measured_by to session_anthropometry
--            Add prescriber + prescription_date to session_prescription
-- Run once against the live DB.

-- Anthropometry: measurement metadata
ALTER TABLE consultation.session_anthropometry
    ADD COLUMN IF NOT EXISTS date_recorded   DATE,
    ADD COLUMN IF NOT EXISTS measured_by     TEXT;

-- Prescription: who prescribed + when
ALTER TABLE consultation.session_prescription
    ADD COLUMN IF NOT EXISTS prescriber          TEXT,
    ADD COLUMN IF NOT EXISTS prescription_date   DATE DEFAULT CURRENT_DATE;
