-- Add policy to allow anyone to look up invites by code (for validation)
-- This is needed so users can validate invite codes before joining
CREATE POLICY "Anyone can lookup invites by code"
ON public.space_invites
FOR SELECT
TO authenticated
USING (true);

-- Drop the restrictive admin-only view policy (we're replacing it with the above)
DROP POLICY IF EXISTS "Admins can view invites" ON public.space_invites;