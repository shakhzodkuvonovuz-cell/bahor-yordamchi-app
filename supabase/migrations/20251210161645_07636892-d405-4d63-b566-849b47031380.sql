-- SECURITY FIX: Restrict profiles table access and create safe view for display

-- 1. Drop the overly permissive SELECT policy on profiles
DROP POLICY IF EXISTS "Authenticated users can read profiles for display" ON public.profiles;

-- 2. Create policy: Users can only SELECT their own profile (full access to own data)
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Create a secure view for display info (no PII) - accessible by authenticated users
CREATE OR REPLACE VIEW public.profile_display AS
SELECT 
  user_id,
  first_name,
  last_name,
  full_name,
  avatar_url
FROM public.profiles;

-- 4. Set permissions on the view
REVOKE ALL ON public.profile_display FROM anon, public;
GRANT SELECT ON public.profile_display TO authenticated;

-- 5. Fix space_invites: Remove public enumeration (get_space_by_invite_code RPC is SECURITY DEFINER and still works)
DROP POLICY IF EXISTS "Anyone can lookup invites by code" ON public.space_invites;

-- 6. Only space admins can view invites directly
CREATE POLICY "Admins can view space invites"
ON public.space_invites
FOR SELECT
TO authenticated
USING (is_space_admin(space_id));