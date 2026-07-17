-- ============================================================
-- Migration: 0016_resolution_flags.sql
-- Dispute system v1: a "flag this resolution" button. No voting
-- system yet — a flag just records the report and notifies every
-- admin (in-app now; the app layer additionally attempts an email,
-- see app/actions/resolve.ts / lib/email.ts).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.resolution_flags (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id   uuid        NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
    reason      text        NOT NULL,
    resolved    boolean     NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    -- One open flag per user per market — prevents a single user from
    -- spamming the admin inbox by re-flagging the same resolution.
    UNIQUE (market_id, user_id)
);

CREATE INDEX IF NOT EXISTS resolution_flags_market_idx ON public.resolution_flags (market_id);

ALTER TABLE public.resolution_flags ENABLE ROW LEVEL SECURITY;

-- No client-side INSERT policy — all writes go through
-- flag_market_resolution (SECURITY DEFINER), which validates the
-- market is actually resolved before recording anything.
CREATE POLICY "read_own_or_admin_flags"
    ON public.resolution_flags
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );


-- ────────────────────────────────────────────────────────────
-- flag_market_resolution — records a dispute flag on a resolved
-- market and notifies every admin in-app. Idempotent per user
-- (ON CONFLICT DO NOTHING) so double-clicking doesn't spam admins
-- with duplicate notifications.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.flag_market_resolution(
    p_market_id uuid,
    p_reason    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid        uuid;
    v_status     text;
    v_question   text;
    v_reason     text;
    v_row_count  int;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    v_reason := trim(p_reason);
    IF v_reason IS NULL OR length(v_reason) = 0 THEN
        RAISE EXCEPTION 'a reason is required to flag a resolution';
    END IF;
    IF length(v_reason) > 500 THEN
        RAISE EXCEPTION 'reason must be 500 characters or fewer';
    END IF;

    SELECT status, question INTO v_status, v_question
    FROM public.markets
    WHERE id = p_market_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'market not found: %', p_market_id;
    END IF;

    IF v_status <> 'resolved' THEN
        RAISE EXCEPTION 'only a resolved market''s resolution can be flagged';
    END IF;

    INSERT INTO public.resolution_flags (market_id, user_id, reason)
    VALUES (p_market_id, v_uid, v_reason)
    ON CONFLICT (market_id, user_id) DO NOTHING;
    GET DIAGNOSTICS v_row_count = ROW_COUNT;

    IF v_row_count = 0 THEN
        RAISE EXCEPTION 'you already flagged this market''s resolution';
    END IF;

    INSERT INTO public.notifications (user_id, type, title, body, market_id)
    SELECT id, 'resolution_flagged', 'Resolution flagged',
           '"' || v_question || '" was flagged for review: ' || v_reason,
           p_market_id
    FROM public.users
    WHERE is_admin = true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.flag_market_resolution(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.flag_market_resolution(uuid, text) TO authenticated;
