-- ============================================================
-- Migration: 0014_notification_copy_and_insert_policy.sql
-- 1. Narrow INSERT policy on notifications so a client can only
--    ever insert a notification for itself (needed for the new
--    market_created notification, written directly from the
--    createMarket server action rather than a SECURITY DEFINER
--    function).
-- 2. Update resolve_market's notification copy to the simpler,
--    uniform wording used for every position holder.
-- ============================================================

CREATE POLICY "users_insert_own_notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

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
    v_created_by      uuid;
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

    -- ── 2. Validate resolution value ─────────────────────────
    IF p_resolution NOT IN ('yes', 'no') THEN
        RAISE EXCEPTION 'resolution must be ''yes'' or ''no''';
    END IF;

    -- ── 3. Lock market row; capture status, creator, question ─
    SELECT status, created_by, question
    INTO   v_status, v_created_by, v_market_question
    FROM   public.markets
    WHERE  id = p_market_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'market not found: %', p_market_id;
    END IF;

    -- ── 4. Permission: admin OR market creator ───────────────
    IF NOT (v_is_admin OR v_uid = v_created_by) THEN
        RAISE EXCEPTION 'only the market creator or an admin can resolve this market';
    END IF;

    IF v_status = 'resolved' THEN
        RAISE EXCEPTION 'market already resolved';
    END IF;

    -- ── 5. Pay out winners ───────────────────────────────────
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

    -- ── 6. Mark market resolved ──────────────────────────────
    UPDATE public.markets
    SET    status      = 'resolved',
           resolution  = p_resolution,
           resolved_by = v_uid,
           resolved_at = now()
    WHERE  id = p_market_id;

    -- ── 7. Notify every position holder with a nonzero position.
    --     Uniform copy regardless of win/loss; crowns_change still
    --     carries the winning share count for the UI's "+N ♛" badge.
    INSERT INTO public.notifications
        (user_id, type, title, body, market_id, crowns_change)
    SELECT
        p.user_id,
        'market_resolved',
        'Market resolved',
        '"' || v_market_question || '" has been resolved '
             || upper(p_resolution) || '. Check your portfolio.',
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

    -- ── 8. Return summary ────────────────────────────────────
    RETURN json_build_object(
        'resolution',  p_resolution,
        'users_paid',  v_users_paid,
        'crowns_paid', v_crowns_paid
    );

END;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_market(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.resolve_market(uuid, text) TO authenticated;
