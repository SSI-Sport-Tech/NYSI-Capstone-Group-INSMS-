-- Migration: add status column to consultation.sessions
-- Run with:
--   PGPASSWORD=<pw> psql -h <host> -U <user> -d <db> -f Backend/migrations/add_session_status.sql

ALTER TABLE consultation.sessions
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
  CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled'));

COMMENT ON COLUMN consultation.sessions.status IS
  'Lifecycle status of the consultation session: scheduled, in-progress, completed, cancelled';
