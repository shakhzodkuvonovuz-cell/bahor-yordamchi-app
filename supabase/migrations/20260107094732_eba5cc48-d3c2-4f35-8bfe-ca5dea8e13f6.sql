-- Fix RLS policies for payment_events - make them service_role specific
DROP POLICY IF EXISTS "Service role can insert payment_events" ON public.payment_events;
DROP POLICY IF EXISTS "Service role can read payment_events" ON public.payment_events;

-- Only service role can insert
CREATE POLICY "Service role can insert payment_events"
ON public.payment_events
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Only service role can read all
CREATE POLICY "Service role can read all payment_events"
ON public.payment_events
FOR SELECT
USING (auth.role() = 'service_role');