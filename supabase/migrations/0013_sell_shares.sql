-- ============================================================
-- Migration: 0013_sell_shares.sql
-- Adds the ability to sell shares before market resolution.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1.  trades.type
--
--     execute_trade has inserted into a `type` column since
--     0003, but no migration ever added it to the trades table
--     (0001_init.sql omits it). ADD COLUMN IF NOT EXISTS makes
--     this safe to re-run / safe if it was added out-of-band.
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.trades
    ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'buy'
        CHECK (type IN ('buy', 'sell'));


-- ────────────────────────────────────────────────────────────
-- 2.  sell_shares
--
--     Mirror of execute_trade: lets a user exit part or all of
--     an existing position before the market closes. Payout is
--     C(before) - C(after), computed by reusing lmsr_cost with
--     a negated share count (lmsr_cost is continuous in
--     `shares`, so lmsr_cost(..., -N) = C(q - N) - C(q), i.e.
--     the negative of the sell payout).
--
--     SECURITY DEFINER so it can write through RLS on users,
--     markets, positions, and trades. Caller identity comes
--     from auth.uid() only.
--
--     Lock order: market → user → position, matching the order
--     execute_trade touches those rows, so no deadlock is
--     possible between concurrent buys, sells, or resolutions.
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
    SELECT b, q_yes, q_no, status
    INTO   v_b, v_q_yes, v_q_no, v_status
    FROM   public.markets
    WHERE  id = p_market_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'market not found: %', p_market_id;
    END IF;

    IF v_status <> 'open' THEN
        RAISE EXCEPTION 'market is not open (status: %)', v_status;
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


-- ────────────────────────────────────────────────────────────
-- 3.  Permissions
-- ────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.sell_shares(uuid, text, numeric) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.sell_shares(uuid, text, numeric) TO authenticated;
