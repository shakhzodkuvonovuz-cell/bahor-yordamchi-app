-- Remove remaining always-true INSERT policy by adding basic input validation

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
WITH CHECK (
  length(trim(contact)) > 0
  AND length(trim(plan)) > 0
);
