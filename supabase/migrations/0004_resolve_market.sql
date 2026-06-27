-- ============================================================
-- Migration: 0004_resolve_market.sql
-- Admin-only market resolution with winner payout.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1.  Add is_admin to users (idempotent)
--
--     IF NOT EXISTS makes this safe to re-run if the column
--     was added out-of-band.
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;


-- ────────────────────────────────────────────────────────────
-- 2.  resolve_market
--
--     Resolves a market and pays 1 crown per winning share to
--     every position holder on the winning side, in a single
--     atomic transaction.
--
--     SECURITY DEFINER so it can write through RLS on users,
--     markets, and positions.  The caller's identity still
--     comes from auth.uid() — never from a parameter — so
--     admin impersonation is impossible.
--
--     Lock order: market row first (matches execute_trade).
--     This guarantees no deadlock between a concurrent trade
--     and a concurrent resolution: both block on the market
--     lock before touching user rows.
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
    v_uid         uuid;
    v_is_admin    boolean;
    v_status      text;
    v_users_paid  bigint;
    v_crowns_paid numeric;
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

    -- ── 3. Lock market row ───────────────────────────────────
    SELECT status
    INTO   v_status
    FROM   public.markets
    WHERE  id = p_market_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'market not found: %', p_market_id;
    END IF;

    -- Idempotency guard: a second call after resolution must
    -- be a no-op error, not a second payout.
    IF v_status = 'resolved' THEN
        RAISE EXCEPTION 'market already resolved';
    END IF;

    -- ── 4. Pay out winners (single set-based UPDATE) ─────────
    --
    --   Join users to positions for this market, add the
    --   winning share count to each user's crown balance.
    --   Filter to rows where winning shares > 0 so the count
    --   and sum reflect only users who actually received crowns.
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

    -- ── 6. Return summary ────────────────────────────────────
    RETURN json_build_object(
        'resolution',  p_resolution,
        'users_paid',  v_users_paid,
        'crowns_paid', v_crowns_paid
    );

END;
$$;


-- ────────────────────────────────────────────────────────────
-- 3.  Permissions
--
--     Strip the default PUBLIC grant, re-grant only to the
--     authenticated role.  Anon callers cannot call this
--     function at all; the is_admin check inside the function
--     is a second layer of defence.
-- ────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.resolve_market(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.resolve_market(uuid, text) TO authenticated;
