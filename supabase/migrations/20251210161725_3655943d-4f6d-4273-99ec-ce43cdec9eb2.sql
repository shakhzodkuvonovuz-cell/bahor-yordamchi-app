-- Fix: Recreate view without SECURITY DEFINER (use SECURITY INVOKER which is default)
DROP VIEW IF EXISTS public.profile_display;

CREATE VIEW public.profile_display 
WITH (security_invoker = true) AS
SELECT 
  user_id,
  first_name,
  last_name,
  full_name,
  avatar_url
FROM public.profiles;

-- Re-grant permissions
REVOKE ALL ON public.profile_display FROM anon, public;
GRANT SELECT ON public.profile_display TO authenticated;