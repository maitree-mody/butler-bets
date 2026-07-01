-- ============================================================
-- Migration: 0011_block_creator_trading.sql
-- Market creators cannot trade on their own markets, since
-- they have resolution authority and would face no risk.
-- ============================================================

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
    SELECT b, q_yes, q_no, status, created_by
    INTO   v_b, v_q_yes, v_q_no, v_status, v_created_by
    FROM   public.markets
    WHERE  id = p_market_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'market not found: %', p_market_id;
    END IF;

    IF v_status <> 'open' THEN
        RAISE EXCEPTION 'market is not open (status: %)', v_status;
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
