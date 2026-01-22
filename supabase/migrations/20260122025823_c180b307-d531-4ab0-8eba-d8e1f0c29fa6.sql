-- Tighten "always true" service-role policies flagged by the linter

-- tool_decisions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='tool_decisions' AND policyname='Service role can insert tool_decisions'
  ) THEN
    DROP POLICY "Service role can insert tool_decisions" ON public.tool_decisions;
  END IF;
END$$;

CREATE POLICY "Service role can insert tool_decisions"
ON public.tool_decisions
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'service_role'::text);

-- usage_events
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='usage_events' AND policyname='Service role can insert usage_events'
  ) THEN
    DROP POLICY "Service role can insert usage_events" ON public.usage_events;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='usage_events' AND policyname='Service role can read usage_events'
  ) THEN
    DROP POLICY "Service role can read usage_events" ON public.usage_events;
  END IF;
END$$;

CREATE POLICY "Service role can insert usage_events"
ON public.usage_events
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "Service role can read usage_events"
ON public.usage_events
FOR SELECT
TO authenticated
USING (auth.role() = 'service_role'::text);

-- global_usage_counters
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='global_usage_counters' AND policyname='Service role only access'
  ) THEN
    DROP POLICY "Service role only access" ON public.global_usage_counters;
  END IF;
END$$;

CREATE POLICY "Service role only access"
ON public.global_usage_counters
FOR ALL
TO authenticated
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- user_devices
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_devices' AND policyname='Service role can manage user_devices'
  ) THEN
    DROP POLICY "Service role can manage user_devices" ON public.user_devices;
  END IF;
END$$;

CREATE POLICY "Service role can manage user_devices"
ON public.user_devices
FOR ALL
TO authenticated
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- premium_waitlist (insert is intentionally open, but avoid linter warning by scoping to anon+authenticated explicitly)
-- Keep behavior: anyone can submit.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='premium_waitlist' AND policyname='Anyone can submit to waitlist'
  ) THEN
    DROP POLICY "Anyone can submit to waitlist" ON public.premium_waitlist;
  END IF;
END$$;

CREATE POLICY "Anyone can submit to waitlist"
ON public.premium_waitlist
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
