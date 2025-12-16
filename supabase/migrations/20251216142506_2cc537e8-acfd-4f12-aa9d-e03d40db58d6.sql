-- Fix #1: Add RLS to profile_display view by recreating it with proper security
-- First drop the existing view
DROP VIEW IF EXISTS public.profile_display;

-- Recreate with SECURITY INVOKER (respects caller's permissions)
CREATE VIEW public.profile_display 
WITH (security_invoker = true)
AS 
SELECT 
  user_id,
  avatar_url,
  first_name,
  last_name,
  full_name
FROM public.profiles;

-- Grant SELECT only to authenticated users
REVOKE ALL ON public.profile_display FROM anon;
REVOKE ALL ON public.profile_display FROM public;
GRANT SELECT ON public.profile_display TO authenticated;

-- Fix #2: Add restrictive policy for global_usage_counters (service role only)
CREATE POLICY "Service role only access"
ON public.global_usage_counters
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix #3: Add INSERT policy for tool_decisions (service role only, backend logging)
CREATE POLICY "Service role can insert tool_decisions"
ON public.tool_decisions
FOR INSERT
TO service_role
WITH CHECK (true);

-- Fix #4: Add missing policies for user_devices (service role management)
CREATE POLICY "Service role can manage user_devices"
ON public.user_devices
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);