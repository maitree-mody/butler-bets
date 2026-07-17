-- ============================================================
-- Migration: 0018_comments.sql
-- Comment section on markets. Plain RLS-gated table, no SECURITY
-- DEFINER function needed — comments don't touch crowns/shares,
-- same pattern as the client-side notifications insert in
-- createMarket (app/actions/markets.ts).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.comments (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id  uuid        NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
    user_id    uuid        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
    body       text        NOT NULL CHECK (length(body) > 0 AND length(body) <= 500),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_market_created_idx ON public.comments (market_id, created_at);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_can_read_comments"
    ON public.comments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "users_insert_own_comments"
    ON public.comments FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Own comment, or an admin (moderation surface — named-individual gossip
-- markets are explicitly the platform's normal use case per the LLM
-- review gate, so an abuse-report-and-remove path matters here).
CREATE POLICY "delete_own_or_admin_comments"
    ON public.comments FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );
