-- Fix profile_display view RLS issue by making it SECURITY INVOKER (inherits caller's RLS)
-- and granting SELECT only to authenticated users

-- Drop the existing view
DROP VIEW IF EXISTS public.profile_display;

-- Recreate with SECURITY INVOKER (which is the default, but being explicit)
CREATE VIEW public.profile_display 
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  first_name,
  last_name,
  full_name,
  avatar_url
FROM profiles;

-- Grant SELECT to authenticated users only (view inherits RLS from profiles table)
REVOKE ALL ON public.profile_display FROM anon;
REVOKE ALL ON public.profile_display FROM public;
GRANT SELECT ON public.profile_display TO authenticated;

-- Restrict global_usage_counters to service role only
DROP POLICY IF EXISTS "Anyone can read global usage" ON public.global_usage_counters;

-- Only service role (backend) should read this data
-- No policy needed as service role bypasses RLS