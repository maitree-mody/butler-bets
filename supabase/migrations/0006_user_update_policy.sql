-- ============================================================
-- Migration: 0006_user_update_policy.sql
-- Allow authenticated users to update their own profile row.
-- Sensitive columns (crowns, is_admin) are written only by
-- SECURITY DEFINER functions, so we revoke direct UPDATE
-- access to them from the authenticated role before opening
-- the policy.
-- ============================================================

-- Strip column-level write access to financial/admin fields.
-- SECURITY DEFINER functions run as the function owner, not
-- as the authenticated role, so this does not affect them.
REVOKE UPDATE (crowns, is_admin) ON public.users FROM authenticated;

-- Let each user update their own row (display_name, email, etc.)
CREATE POLICY "users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING  (id = auth.uid())
  WITH CHECK (id = auth.uid());
