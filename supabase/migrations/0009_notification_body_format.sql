-- ============================================================
-- Migration: 0009_notification_body_format.sql
-- Richer notification body: includes market question and
-- crown amount in a single human-readable sentence.
-- ============================================================

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

    -- ── 4. Pay out winners (unchanged) ───────────────────────
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

    -- ── 6. Notify position holders ───────────────────────────
    --
    --   Winner body:  "You won 47 crowns! 'Question?' resolved YES."
    --   Loser body:   "'Question?' resolved NO. Better luck next time."
    --
    --   round() keeps the crown count as a clean integer since
    --   1 winning share = 1 crown and shares are whole in practice.
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
            THEN 'You won ' || round(calc.winning_shares)::text
                 || ' crowns! "' || v_market_question
                 || '" resolved ' || upper(p_resolution) || '.'
            ELSE '"' || v_market_question
                 || '" resolved ' || upper(p_resolution)
                 || '. Better luck next time.'
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
