-- ============================================================
-- Migration: 0015_market_lifecycle.sql
-- Markets currently stay tradeable forever past closes_at — status
-- only ever flips to 'closed'/'resolved' via a manual resolve_market
-- call. This migration closes that gap with three layers, since no
-- single one is reliable on its own:
--
--   1. execute_trade / sell_shares now reject once now() > closes_at,
--      even if status hasn't been flipped to 'closed' yet. This is
--      the authoritative guard — trading is blocked the instant a
--      market's deadline passes, independent of cron/app-layer timing.
--   2. close_market_if_expired(uuid) / close_expired_markets() flip
--      status 'open' -> 'closed' for display purposes. The former is
--      callable by any authenticated user so the app can call it
--      opportunistically on page load (see app/markets/[id]/page.tsx);
--      the latter is the sweep used by the cron job below.
--   3. A pg_cron job runs close_expired_markets() every 5 minutes as
--      the primary driver, so status stays accurate even with zero
--      page traffic. If the pg_cron extension isn't enabled on this
--      Supabase project, the DO block below emits a NOTICE instead of
--      failing the migration — enable it via Dashboard > Database >
--      Extensions, then re-run this file (cron.schedule upserts by
--      job name, so re-running is safe).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1a. execute_trade — same body as 0011, plus a closes_at check.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.execute_trade(
    p_market_id uuid,
    p_side      text,
    p_shares    numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid          uuid;
    v_b            numeric;
    v_q_yes        numeric;
    v_q_no         numeric;
    v_status       text;
    v_created_by   uuid;
    v_closes_at    timestamptz;
    v_new_q_yes    numeric;
    v_new_q_no     numeric;
    v_cost         numeric;
    v_price_before numeric;
    v_price_after  numeric;
    v_crowns       numeric;
    v_new_crowns   numeric;
    v_m            numeric;
    v_denom        numeric;
BEGIN

    -- ── 1. Authenticate ─────────────────────────────────────
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    -- ── 2. Validate inputs ──────────────────────────────────
    IF p_side NOT IN ('yes', 'no') THEN
        RAISE EXCEPTION 'side must be ''yes'' or ''no''';
    END IF;
    IF p_shares <= 0 THEN
        RAISE EXCEPTION 'shares must be positive';
    END IF;

    -- ── 3. Lock market row (market before user — fixed lock order) ──
    SELECT b, q_yes, q_no, status, created_by, closes_at
    INTO   v_b, v_q_yes, v_q_no, v_status, v_created_by, v_closes_at
    FROM   public.markets
    WHERE  id = p_market_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'market not found: %', p_market_id;
    END IF;

    IF v_status <> 'open' THEN
        RAISE EXCEPTION 'market is not open (status: %)', v_status;
    END IF;

    IF v_closes_at <= now() THEN
        RAISE EXCEPTION 'market has closed and no longer accepts trades';
    END IF;

    IF v_uid = v_created_by THEN
        RAISE EXCEPTION 'market creators cannot trade on their own market';
    END IF;

    -- ── 4. Cost and price computation ───────────────────────
    v_cost := public.lmsr_cost(v_q_yes, v_q_no, v_b, p_side, p_shares);

    v_m            := GREATEST(v_q_yes / v_b, v_q_no / v_b);
    v_denom        := exp(v_q_yes / v_b - v_m) + exp(v_q_no / v_b - v_m);
    v_price_before := exp(v_q_yes / v_b - v_m) / v_denom;

    IF p_side = 'yes' THEN
        v_new_q_yes := v_q_yes + p_shares;
        v_new_q_no  := v_q_no;
    ELSE
        v_new_q_yes := v_q_yes;
        v_new_q_no  := v_q_no + p_shares;
    END IF;

    v_m           := GREATEST(v_new_q_yes / v_b, v_new_q_no / v_b);
    v_denom       := exp(v_new_q_yes / v_b - v_m) + exp(v_new_q_no / v_b - v_m);
    v_price_after := exp(v_new_q_yes / v_b - v_m) / v_denom;

    -- ── 5. Lock user row, check balance ──────────────────────
    SELECT crowns
    INTO   v_crowns
    FROM   public.users
    WHERE  id = v_uid
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'user record not found for id %', v_uid;
    END IF;

    IF v_crowns < v_cost THEN
        RAISE EXCEPTION 'insufficient crowns (have %, need %)', v_crowns, v_cost;
    END IF;

    v_new_crowns := v_crowns - v_cost;

    -- ── 6. Atomic writes ─────────────────────────────────────

    UPDATE public.users
    SET    crowns = v_new_crowns
    WHERE  id = v_uid;

    UPDATE public.markets
    SET    q_yes = v_new_q_yes,
           q_no  = v_new_q_no
    WHERE  id = p_market_id;

    INSERT INTO public.positions (user_id, market_id, yes_shares, no_shares)
    VALUES (
        v_uid,
        p_market_id,
        CASE WHEN p_side = 'yes' THEN p_shares ELSE 0 END,
        CASE WHEN p_side = 'no'  THEN p_shares ELSE 0 END
    )
    ON CONFLICT (user_id, market_id) DO UPDATE
        SET yes_shares = positions.yes_shares + EXCLUDED.yes_shares,
            no_shares  = positions.no_shares  + EXCLUDED.no_shares;

    INSERT INTO public.trades
        (user_id, market_id, side, type, shares, cost, price_before, price_after)
    VALUES
        (v_uid, p_market_id, p_side, 'buy', p_shares, v_cost, v_price_before, v_price_after);

    -- ── 7. Return summary ────────────────────────────────────
    RETURN json_build_object(
        'q_yes',      v_new_q_yes,
        'q_no',       v_new_q_no,
        'price_yes',  v_price_after,
        'cost',       v_cost,
        'new_crowns', v_new_crowns
    );

END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_trade(uuid, text, numeric) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.execute_trade(uuid, text, numeric) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 1b. sell_shares — same body as 0013, plus a closes_at check.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sell_shares(
    p_market_id uuid,
    p_side      text,
    p_shares    numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid          uuid;
    v_b            numeric;
    v_q_yes        numeric;
    v_q_no         numeric;
    v_status       text;
    v_closes_at    timestamptz;
    v_crowns       numeric;
    v_yes_shares   numeric;
    v_no_shares    numeric;
    v_held         numeric;
    v_new_q_yes    numeric;
    v_new_q_no     numeric;
    v_payout       numeric;
    v_price_before numeric;
    v_price_after  numeric;
    v_new_crowns   numeric;
    v_m            numeric;
    v_denom        numeric;
BEGIN

    -- ── 1. Authenticate ─────────────────────────────────────
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    -- ── 2. Validate inputs ──────────────────────────────────
    IF p_side NOT IN ('yes', 'no') THEN
        RAISE EXCEPTION 'side must be ''yes'' or ''no''';
    END IF;
    IF p_shares <= 0 THEN
        RAISE EXCEPTION 'shares must be positive';
    END IF;
    IF p_shares > 100000 THEN
        RAISE EXCEPTION 'share count cannot exceed 100000 per trade (requested: %)', p_shares;
    END IF;

    -- ── 3. Lock market row (market before user before position) ──
    SELECT b, q_yes, q_no, status, closes_at
    INTO   v_b, v_q_yes, v_q_no, v_status, v_closes_at
    FROM   public.markets
    WHERE  id = p_market_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'market not found: %', p_market_id;
    END IF;

    IF v_status <> 'open' THEN
        RAISE EXCEPTION 'market is not open (status: %)', v_status;
    END IF;

    IF v_closes_at <= now() THEN
        RAISE EXCEPTION 'market has closed and no longer accepts trades';
    END IF;

    -- ── 4. Lock user row ─────────────────────────────────────
    SELECT crowns
    INTO   v_crowns
    FROM   public.users
    WHERE  id = v_uid
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'user record not found for id %', v_uid;
    END IF;

    -- ── 5. Lock position row, check holdings ─────────────────
    SELECT yes_shares, no_shares
    INTO   v_yes_shares, v_no_shares
    FROM   public.positions
    WHERE  user_id = v_uid AND market_id = p_market_id
    FOR UPDATE;

    IF NOT FOUND THEN
        v_yes_shares := 0;
        v_no_shares  := 0;
    END IF;

    v_held := CASE WHEN p_side = 'yes' THEN v_yes_shares ELSE v_no_shares END;

    IF v_held < p_shares THEN
        RAISE EXCEPTION 'insufficient shares (have %, need %)', v_held, p_shares;
    END IF;

    -- ── 6. Payout and price computation ──────────────────────
    v_payout := -public.lmsr_cost(v_q_yes, v_q_no, v_b, p_side, -p_shares);

    -- YES price before
    v_m            := GREATEST(v_q_yes / v_b, v_q_no / v_b);
    v_denom        := exp(v_q_yes / v_b - v_m) + exp(v_q_no / v_b - v_m);
    v_price_before := exp(v_q_yes / v_b - v_m) / v_denom;

    IF p_side = 'yes' THEN
        v_new_q_yes := v_q_yes - p_shares;
        v_new_q_no  := v_q_no;
    ELSE
        v_new_q_yes := v_q_yes;
        v_new_q_no  := v_q_no - p_shares;
    END IF;

    -- YES price after
    v_m           := GREATEST(v_new_q_yes / v_b, v_new_q_no / v_b);
    v_denom       := exp(v_new_q_yes / v_b - v_m) + exp(v_new_q_no / v_b - v_m);
    v_price_after := exp(v_new_q_yes / v_b - v_m) / v_denom;

    v_new_crowns := v_crowns + v_payout;

    -- ── 7. Atomic writes ─────────────────────────────────────

    UPDATE public.users
    SET    crowns = v_new_crowns
    WHERE  id = v_uid;

    UPDATE public.markets
    SET    q_yes = v_new_q_yes,
           q_no  = v_new_q_no
    WHERE  id = p_market_id;

    UPDATE public.positions
    SET    yes_shares = yes_shares - CASE WHEN p_side = 'yes' THEN p_shares ELSE 0 END,
           no_shares  = no_shares  - CASE WHEN p_side = 'no'  THEN p_shares ELSE 0 END
    WHERE  user_id = v_uid AND market_id = p_market_id;

    -- cost is signed: positive for buys, negative for sells, so
    -- sum(cost) over a user's trades equals net crowns spent.
    INSERT INTO public.trades
        (user_id, market_id, side, type, shares, cost, price_before, price_after)
    VALUES
        (v_uid, p_market_id, p_side, 'sell', p_shares, -v_payout, v_price_before, v_price_after);

    -- ── 8. Return summary ────────────────────────────────────
    RETURN json_build_object(
        'q_yes',      v_new_q_yes,
        'q_no',       v_new_q_no,
        'price_yes',  v_price_after,
        'payout',     v_payout,
        'new_crowns', v_new_crowns
    );

END;
$$;

REVOKE EXECUTE ON FUNCTION public.sell_shares(uuid, text, numeric) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.sell_shares(uuid, text, numeric) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 2. close_expired_markets() — full sweep, used by the cron job.
--    Plain status flip, no balance/share writes, so no need for
--    row locking beyond the implicit UPDATE lock.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.close_expired_markets()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    UPDATE public.markets
    SET    status = 'closed'
    WHERE  status = 'open'
      AND  closes_at <= now();
$$;

REVOKE EXECUTE ON FUNCTION public.close_expired_markets() FROM PUBLIC;
-- service_role only — this is the cron entry point, not an app RPC.
GRANT  EXECUTE ON FUNCTION public.close_expired_markets() TO service_role;


-- ────────────────────────────────────────────────────────────
-- 3. close_market_if_expired(uuid) — single-market version, callable
--    by any authenticated user so the market page can call it
--    opportunistically on load (cheap fallback for the 5-minute
--    cron gap).
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.close_market_if_expired(p_market_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    UPDATE public.markets
    SET    status = 'closed'
    WHERE  id = p_market_id
      AND  status = 'open'
      AND  closes_at <= now();
$$;

REVOKE EXECUTE ON FUNCTION public.close_market_if_expired(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.close_market_if_expired(uuid) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 4. pg_cron schedule — best-effort. Skips with a NOTICE (not an
--    error) if pg_cron isn't installed, so the rest of this
--    migration still applies.
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'close-expired-markets',
            '*/5 * * * *',
            $cron$SELECT public.close_expired_markets();$cron$
        );
    ELSE
        RAISE NOTICE 'pg_cron is not installed on this project — enable it via Supabase Dashboard > Database > Extensions, then re-run this migration to schedule close-expired-markets. Until then, close_market_if_expired() (called on market-page load) and the closes_at guard inside execute_trade/sell_shares still keep trading correctly stopped.';
    END IF;
END $$;
