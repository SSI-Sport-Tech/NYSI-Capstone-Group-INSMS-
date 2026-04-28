-- Migration: replace consultation.sessions status CHECK from in-progress to expired
-- Run with:
--   PGPASSWORD=<pw> psql -h <host> -U <user> -d <db> -f Backend/migrations/replace_in_progress_with_expired_session_status.sql

BEGIN;

-- Normalize legacy rows before tightening the CHECK constraint.
-- Future-dated "in-progress" sessions become "scheduled".
-- Past-dated "in-progress" sessions become "expired".
UPDATE consultation.sessions
SET status = CASE
  WHEN date_of_consult > CURRENT_DATE THEN 'scheduled'
  WHEN date_of_consult = CURRENT_DATE
       AND COALESCE(time_of_consult, TIME '23:59:59') >= CURRENT_TIME THEN 'scheduled'
  ELSE 'expired'
END
WHERE status = 'in-progress';

ALTER TABLE consultation.sessions
DROP CONSTRAINT IF EXISTS sessions_status_check;

ALTER TABLE consultation.sessions
ADD CONSTRAINT sessions_status_check
CHECK (status IN ('scheduled', 'expired', 'completed', 'cancelled'));

COMMENT ON COLUMN consultation.sessions.status IS
  'Lifecycle status of the consultation session: scheduled, expired, completed, cancelled';

COMMIT;
