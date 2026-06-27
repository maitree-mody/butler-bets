-- ============================================================
-- Migration: 0005_display_name.sql
-- Add display_name to public.users.
-- ============================================================

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS display_name text;
