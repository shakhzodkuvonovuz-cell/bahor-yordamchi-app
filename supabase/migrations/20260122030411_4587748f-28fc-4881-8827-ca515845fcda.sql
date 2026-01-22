-- Ensure atmos_cards cannot be read by end users (defense-in-depth)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='atmos_cards' AND policyname='Users can view their own cards'
  ) THEN
    DROP POLICY "Users can view their own cards" ON public.atmos_cards;
  END IF;
END$$;

REVOKE ALL ON TABLE public.atmos_cards FROM anon;
REVOKE ALL ON TABLE public.atmos_cards FROM authenticated;
