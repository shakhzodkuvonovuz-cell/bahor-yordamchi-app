-- 1) Split PII out of profiles into a private table (phone/email)
-- Phone is application PII; email should come from auth user, not stored in profiles.

-- Create private table for sensitive profile fields
CREATE TABLE IF NOT EXISTS public.profiles_private (
  user_id uuid PRIMARY KEY,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles_private ENABLE ROW LEVEL SECURITY;

-- Policies: owner-only access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles_private' AND policyname='Users can read own private profile'
  ) THEN
    CREATE POLICY "Users can read own private profile"
    ON public.profiles_private
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles_private' AND policyname='Users can insert own private profile'
  ) THEN
    CREATE POLICY "Users can insert own private profile"
    ON public.profiles_private
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles_private' AND policyname='Users can update own private profile'
  ) THEN
    CREATE POLICY "Users can update own private profile"
    ON public.profiles_private
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles_private' AND policyname='Users can delete own private profile'
  ) THEN
    CREATE POLICY "Users can delete own private profile"
    ON public.profiles_private
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END$$;

-- Keep timestamps updated (reuse existing trigger function if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pg_function_is_visible(oid)) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname='update_profiles_private_updated_at' AND tgrelid='public.profiles_private'::regclass
    ) THEN
      CREATE TRIGGER update_profiles_private_updated_at
      BEFORE UPDATE ON public.profiles_private
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
  END IF;
END$$;

-- Migrate existing phone values from profiles into profiles_private
INSERT INTO public.profiles_private (user_id, phone)
SELECT user_id, phone
FROM public.profiles
WHERE phone IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone;

-- Drop PII columns from profiles table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='phone'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN phone;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='email'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN email;
  END IF;
END$$;

-- Convenience view for the app to fetch the combined profile (owner-only due to underlying RLS)
CREATE OR REPLACE VIEW public.my_profile
WITH (security_invoker=on)
AS
SELECT
  p.id,
  p.user_id,
  p.created_at,
  p.updated_at,
  p.messages_today,
  p.daily_limit,
  p.last_reset_date,
  p.trial_started_at,
  p.trial_expires_at,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.plan,
  p.full_name,
  p.language,
  p.theme,
  pp.phone
FROM public.profiles p
LEFT JOIN public.profiles_private pp
  ON pp.user_id = p.user_id;

GRANT SELECT ON public.my_profile TO authenticated;


-- 2) Lock down atmos_cards (contains sensitive payment tokens)
-- The app does not need client-side access to this table.

ALTER TABLE public.atmos_cards ENABLE ROW LEVEL SECURITY;

-- Remove any user-facing read policy if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='atmos_cards' AND policyname='Users can view their own cards'
  ) THEN
    DROP POLICY "Users can view their own cards" ON public.atmos_cards;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='atmos_cards' AND policyname='Service role full access to cards'
  ) THEN
    DROP POLICY "Service role full access to cards" ON public.atmos_cards;
  END IF;
END$$;

-- Only service role should access this table
CREATE POLICY "Service role full access to cards"
ON public.atmos_cards
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Remove table privileges for client roles (defense-in-depth)
REVOKE ALL ON TABLE public.atmos_cards FROM anon;
REVOKE ALL ON TABLE public.atmos_cards FROM authenticated;

-- Service role should retain access
GRANT ALL ON TABLE public.atmos_cards TO service_role;
