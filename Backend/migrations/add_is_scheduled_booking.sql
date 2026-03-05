-- Migration: Add is_scheduled_booking flag to consultation.sessions
-- Purpose: Track whether a session was created from the dashboard (scheduled booking)
--          vs created ad-hoc from ConsultationView (walk-in / direct).
-- Date: 2026-03-04

ALTER TABLE consultation.sessions
ADD COLUMN IF NOT EXISTS is_scheduled_booking BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN consultation.sessions.is_scheduled_booking IS
  'TRUE if this session was booked via the dashboard scheduling flow. '
  'FALSE (default) if created ad-hoc from the ConsultationView.';
