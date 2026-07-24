-- Migration to add change_log column to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS change_log JSONB NOT NULL DEFAULT '[]'::jsonb;
