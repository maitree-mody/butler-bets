-- ============================================================
-- Migration: 0019_comment_attachments.sql
-- Adds an optional image/gif attachment to comments, uploaded to a
-- public Supabase Storage bucket. Relaxes the body-required check
-- so an image-only comment (no caption) is allowed. Clickable links
-- in comment text are handled purely client-side (see lib/linkify.tsx)
-- — no schema change needed for those.
-- ============================================================

ALTER TABLE public.comments
    ADD COLUMN IF NOT EXISTS attachment_url text;

ALTER TABLE public.comments
    ALTER COLUMN body SET DEFAULT '';

ALTER TABLE public.comments
    DROP CONSTRAINT IF EXISTS comments_body_check;

ALTER TABLE public.comments
    ADD CONSTRAINT comments_body_check
    CHECK (length(body) <= 500 AND (length(body) > 0 OR attachment_url IS NOT NULL));


-- ────────────────────────────────────────────────────────────
-- Public bucket for comment attachments. Public so images render
-- directly from their URL with no signed-request round trip per
-- view; write/delete access is still gated by the policies below.
-- Uploads are namespaced under the uploader's own auth uid as the
-- first path segment (e.g. `{user_id}/{uuid}.png`), which is what
-- the delete policy checks — see app/markets/[id]/CommentSection.tsx
-- for the upload path construction.
-- ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('comment-attachments', 'comment-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "anyone_can_view_comment_attachments"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'comment-attachments');

CREATE POLICY "users_upload_own_comment_attachments"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'comment-attachments'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "users_delete_own_or_admin_comment_attachments"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'comment-attachments'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
        )
    );
