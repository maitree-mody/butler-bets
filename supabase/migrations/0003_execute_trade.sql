-- ============================================================
-- Migration: 0003_execute_trade.sql
-- LMSR cost function + the single safe write path for trades.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1.  lmsr_cost
--
--     Returns the crowns cost to BUY `shares` of `side` on a
--     market currently at (q_yes, q_no) with liquidity b.
--
--     Formula:  cost = C(after) − C(before)
--               C(qy, qn) = b · ln( exp(qy/b) + exp(qn/b) )
--
--     The log-sum-exp trick (subtract max before calling exp)
--     prevents floating-point overflow for large q values.
--
--     Marked IMMUTABLE so it can be called in CHECK constraints,
--     indexes, and tested directly in the SQL editor without
--     touching any table.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.lmsr_cost(
    q_yes  numeric,
    q_no   numeric,
    b      numeric,
    side   text,
    shares numeric
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    nqy      numeric;   -- q_yes after trade
    nqn      numeric;   -- q_no  after trade
    m0       numeric;   -- max(q_yes/b, q_no/b) — anchors log-sum-exp before
    m1       numeric;   -- max(nqy/b,   nqn/b)  — anchors log-sum-exp after
    c_before numeric;
    c_after  numeric;
BEGIN
    IF side = 'yes' THEN
        nqy := q_yes + shares;
        nqn := q_no;
    ELSE
        nqy := q_yes;
        nqn := q_no + shares;
    END IF;

    -- C_before
    m0       := GREATEST(q_yes / b, q_no / b);
    c_before := b * (m0 + ln(exp(q_yes / b - m0) + exp(q_no / b - m0)));

    -- C_after
    m1      := GREATEST(nqy / b, nqn / b);
    c_after := b * (m1 + ln(exp(nqy / b - m1) + exp(nqn / b - m1)));

    RETURN c_after - c_before;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 2.  execute_trade
--
--     The ONLY code path that may write to trades, positions,
--     and users.crowns.  Runs as the function owner (SECURITY
--     DEFINER) so RLS on those tables never blocks it, but the
--     caller's identity comes from auth.uid() — never from a
--     parameter — which prevents impersonation.
--
--     Lock order:  market row first → user row second.
--     All callers must acquire locks in this order so there is
--     no possibility of a deadlock between concurrent trades.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.execute_trade(
    p_market_id uuid,
    p_side      text,
    p_shares    numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''        -- prevent search-path hijacking inside SECURITY DEFINER
AS $$
DECLARE
    v_uid          uuid;
    v_b            numeric;
    v_q_yes        numeric;
    v_q_no         numeric;
    v_status       text;
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

    -- ── 4. Cost and price computation ───────────────────────
    v_cost := public.lmsr_cost(v_q_yes, v_q_no, v_b, p_side, p_shares);

    -- YES price before = exp(q_yes/b) / (exp(q_yes/b) + exp(q_no/b))
    -- computed via log-sum-exp to stay numerically stable
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

    -- YES price after
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

    -- Upsert: create position row on first trade, accumulate on repeat trades.
    -- EXCLUDED refers to the values from the attempted INSERT row.
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


-- ────────────────────────────────────────────────────────────
-- 3.  Permissions
--
--     Strip the default PUBLIC grant (which would let anon
--     call the function), then explicitly re-grant only to
--     the authenticated role.
--
--     lmsr_cost is pure math with no table access, so it can
--     remain callable by anyone (needed for direct SQL-editor
--     testing).
-- ────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.execute_trade(uuid, text, numeric) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.execute_trade(uuid, text, numeric) TO authenticated;
