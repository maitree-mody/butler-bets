-- ============================================================
-- Migration: 0008_notifications.sql
-- Notifications table + RLS + resolve_market notification inserts.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1.  notifications table
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid        NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
    type           text        NOT NULL,
    title          text        NOT NULL,
    body           text        NOT NULL,
    market_id      uuid                    REFERENCES public.markets(id) ON DELETE SET NULL,
    crowns_change  numeric     NOT NULL DEFAULT 0,
    read           boolean     NOT NULL DEFAULT false,
    created_at     timestamptz NOT NULL DEFAULT now()
);

-- Covers the two read-path queries: unread count for badge,
-- and newest-first list for the inbox panel.
CREATE INDEX IF NOT EXISTS notifications_user_read_created_idx
    ON public.notifications (user_id, read, created_at DESC);


-- ────────────────────────────────────────────────────────────
-- 2.  RLS
--     No INSERT from clients — only resolve_market (SECURITY
--     DEFINER) writes rows.  Users may SELECT and UPDATE (to
--     mark read) their own rows only.
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_notifications"
    ON public.notifications
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "users_update_own_notifications"
    ON public.notifications
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- 3.  resolve_market — same logic as 0004, with notification
--     inserts added after the payout step.
--     SECURITY DEFINER lets the function write through RLS.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_market(
    p_market_id  uuid,
    p_resolution text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid             uuid;
    v_is_admin        boolean;
    v_status          text;
    v_market_question text;
    v_users_paid      bigint;
    v_crowns_paid     numeric;
BEGIN

    -- ── 1. Authenticate ─────────────────────────────────────
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    SELECT is_admin
    INTO   v_is_admin
    FROM   public.users
    WHERE  id = v_uid;

    IF NOT FOUND OR v_is_admin IS NOT TRUE THEN
        RAISE EXCEPTION 'only admins can resolve markets';
    END IF;

    -- ── 2. Validate resolution value ─────────────────────────
    IF p_resolution NOT IN ('yes', 'no') THEN
        RAISE EXCEPTION 'resolution must be ''yes'' or ''no''';
    END IF;

    -- ── 3. Lock market row and capture question text ─────────
    SELECT status, question
    INTO   v_status, v_market_question
    FROM   public.markets
    WHERE  id = p_market_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'market not found: %', p_market_id;
    END IF;

    IF v_status = 'resolved' THEN
        RAISE EXCEPTION 'market already resolved';
    END IF;

    -- ── 4. Pay out winners (unchanged from 0004) ─────────────
    WITH payout AS (
        UPDATE public.users u
        SET    crowns = u.crowns + CASE
                   WHEN p_resolution = 'yes' THEN p.yes_shares
                   ELSE p.no_shares
               END
        FROM   public.positions p
        WHERE  p.market_id = p_market_id
          AND  u.id = p.user_id
          AND  CASE
                   WHEN p_resolution = 'yes' THEN p.yes_shares
                   ELSE p.no_shares
               END > 0
        RETURNING CASE
                      WHEN p_resolution = 'yes' THEN p.yes_shares
                      ELSE p.no_shares
                  END AS crowns_added
    )
    SELECT COUNT(*),
           COALESCE(SUM(crowns_added), 0)
    INTO   v_users_paid,
           v_crowns_paid
    FROM   payout;

    -- ── 5. Mark market resolved ──────────────────────────────
    UPDATE public.markets
    SET    status      = 'resolved',
           resolution  = p_resolution,
           resolved_by = v_uid,
           resolved_at = now()
    WHERE  id = p_market_id;

    -- ── 6. Notify every user who held a position ─────────────
    --
    --   winning_shares = shares on the winning side for that user.
    --   Winners  (winning_shares > 0): "You won!" with crowns_change = winning_shares.
    --   Holders with a losing position only (winning_shares = 0):
    --       gentle "Market resolved" with crowns_change = 0.
    --   Users whose position is fully zero on both sides are excluded.
    INSERT INTO public.notifications
        (user_id, type, title, body, market_id, crowns_change)
    SELECT
        p.user_id,
        'market_resolved',
        CASE
            WHEN calc.winning_shares > 0 THEN 'You won!'
            ELSE 'Market resolved'
        END,
        CASE
            WHEN calc.winning_shares > 0
            THEN 'You held ' || calc.winning_shares::text
                 || ' winning ' || p_resolution || ' shares in "'
                 || v_market_question
                 || '" and won ' || calc.winning_shares::text || ' crowns.'
            ELSE '"' || v_market_question || '" resolved '
                 || p_resolution || '. Better luck next time.'
        END,
        p_market_id,
        CASE WHEN calc.winning_shares > 0 THEN calc.winning_shares ELSE 0 END
    FROM public.positions p
    CROSS JOIN LATERAL (
        SELECT CASE
                   WHEN p_resolution = 'yes' THEN p.yes_shares
                   ELSE p.no_shares
               END AS winning_shares
    ) calc
    WHERE p.market_id = p_market_id
      AND (p.yes_shares > 0 OR p.no_shares > 0);

    -- ── 7. Return summary ────────────────────────────────────
    RETURN json_build_object(
        'resolution',  p_resolution,
        'users_paid',  v_users_paid,
        'crowns_paid', v_crowns_paid
    );

END;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_market(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.resolve_market(uuid, text) TO authenticated;
