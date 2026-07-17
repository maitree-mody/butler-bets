-- ============================================================
-- Migration: 0017_reresolve_market.sql
-- Admin override for a wrong resolution. resolve_market's only
-- existing safeguard is idempotency (can't resolve twice) — there
-- was previously no way to correct a bad call short of hand-written
-- SQL run outside the app. reresolve_market fixes that: admin-only,
-- reverses the old payout and applies the new one atomically, from
-- the still-intact positions table (no trading happens after a
-- market resolves, so positions are exactly what they were at the
-- original payout).
-- ============================================================

ALTER TABLE public.markets
    ADD COLUMN IF NOT EXISTS previous_resolution text CHECK (previous_resolution IN ('yes', 'no'));

CREATE OR REPLACE FUNCTION public.reresolve_market(
    p_market_id      uuid,
    p_new_resolution text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid              uuid;
    v_is_admin         boolean;
    v_status           text;
    v_old_resolution   text;
    v_market_question  text;
    v_users_paid       bigint;
    v_crowns_delta_sum numeric;
BEGIN

    -- ── 1. Authenticate + authorize (admin only — not the creator, ──
    --      since the creator may be the one whose call is disputed) ─
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    SELECT is_admin INTO v_is_admin FROM public.users WHERE id = v_uid;
    IF NOT FOUND OR v_is_admin IS NOT TRUE THEN
        RAISE EXCEPTION 'only admins can override a resolution';
    END IF;

    -- ── 2. Validate input ────────────────────────────────────
    IF p_new_resolution NOT IN ('yes', 'no') THEN
        RAISE EXCEPTION 'resolution must be ''yes'' or ''no''';
    END IF;

    -- ── 3. Lock market row, capture prior state ──────────────
    SELECT status, resolution, question
    INTO   v_status, v_old_resolution, v_market_question
    FROM   public.markets
    WHERE  id = p_market_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'market not found: %', p_market_id;
    END IF;

    IF v_status <> 'resolved' THEN
        RAISE EXCEPTION 'market must already be resolved before it can be overridden';
    END IF;

    IF p_new_resolution = v_old_resolution THEN
        RAISE EXCEPTION 'new resolution matches the existing resolution — nothing to override';
    END IF;

    -- ── 4. Reverse the old payout and apply the new one in one ──
    --      set-based UPDATE: delta = new_payout - old_payout.
    WITH deltas AS (
        UPDATE public.users u
        SET    crowns = u.crowns
                 + (CASE WHEN p_new_resolution = 'yes' THEN p.yes_shares ELSE p.no_shares END)
                 - (CASE WHEN v_old_resolution  = 'yes' THEN p.yes_shares ELSE p.no_shares END)
        FROM   public.positions p
        WHERE  p.market_id = p_market_id
          AND  u.id = p.user_id
          AND  (p.yes_shares > 0 OR p.no_shares > 0)
        RETURNING
            p.user_id,
            (CASE WHEN p_new_resolution = 'yes' THEN p.yes_shares ELSE p.no_shares END)
              - (CASE WHEN v_old_resolution  = 'yes' THEN p.yes_shares ELSE p.no_shares END) AS crowns_delta
    )
    SELECT COUNT(*), COALESCE(SUM(crowns_delta), 0)
    INTO   v_users_paid, v_crowns_delta_sum
    FROM   deltas;

    -- ── 5. Update market: new resolution, audit trail of the old one ─
    UPDATE public.markets
    SET    resolution          = p_new_resolution,
           previous_resolution = v_old_resolution,
           resolved_by         = v_uid,
           resolved_at         = now()
    WHERE  id = p_market_id;

    -- ── 6. Close out any open dispute flags on this market ───
    UPDATE public.resolution_flags
    SET    resolved = true
    WHERE  market_id = p_market_id;

    -- ── 7. Notify every affected position holder with their delta ─
    INSERT INTO public.notifications
        (user_id, type, title, body, market_id, crowns_change)
    SELECT
        p.user_id,
        'market_reresolved',
        'Resolution corrected',
        '"' || v_market_question || '" was corrected from '
             || upper(v_old_resolution) || ' to ' || upper(p_new_resolution)
             || '. Your balance was adjusted by '
             || (CASE WHEN calc.crowns_delta >= 0 THEN '+' ELSE '' END)
             || calc.crowns_delta::text || ' crowns.',
        p_market_id,
        calc.crowns_delta
    FROM public.positions p
    CROSS JOIN LATERAL (
        SELECT (CASE WHEN p_new_resolution = 'yes' THEN p.yes_shares ELSE p.no_shares END)
                 - (CASE WHEN v_old_resolution  = 'yes' THEN p.yes_shares ELSE p.no_shares END) AS crowns_delta
    ) calc
    WHERE p.market_id = p_market_id
      AND (p.yes_shares > 0 OR p.no_shares > 0);

    -- ── 8. Return summary ────────────────────────────────────
    RETURN json_build_object(
        'old_resolution', v_old_resolution,
        'new_resolution', p_new_resolution,
        'users_paid',     v_users_paid,
        'crowns_delta',   v_crowns_delta_sum
    );

END;
$$;

REVOKE EXECUTE ON FUNCTION public.reresolve_market(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reresolve_market(uuid, text) TO authenticated;
