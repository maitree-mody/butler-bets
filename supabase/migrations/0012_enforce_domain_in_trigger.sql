-- ============================================================
-- Migration: 0012_enforce_domain_in_trigger.sql
-- Enforce @columbia.edu / @barnard.edu at the DB level.
--
-- The AFTER INSERT trigger fires before the app callback can
-- run its domain check, so a gmail user's public.users row was
-- being created before the callback could reject them.
-- Raising an exception here rolls back the auth.users insert
-- entirely, so the bad-domain user is never persisted anywhere.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_domain text;
BEGIN
  v_domain := split_part(new.email, '@', 2);

  IF v_domain NOT IN ('columbia.edu', 'barnard.edu') THEN
    RAISE EXCEPTION 'signup_domain_not_allowed: % is not an allowed email domain', v_domain;
  END IF;

  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);

  RETURN new;
END;
$$;
