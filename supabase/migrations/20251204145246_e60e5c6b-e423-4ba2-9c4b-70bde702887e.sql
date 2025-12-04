-- Create user_entitlements table
CREATE TABLE public.user_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  expires_at timestamptz NULL,
  flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index on expires_at for efficient expiry queries
CREATE INDEX idx_user_entitlements_expires_at ON public.user_entitlements(expires_at);

-- Create daily_usage table
CREATE TABLE public.daily_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  messages_count int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- Create index for efficient lookups
CREATE INDEX idx_daily_usage_user_date ON public.daily_usage(user_id, date);

-- Add updated_at trigger to user_entitlements
CREATE TRIGGER update_user_entitlements_updated_at
  BEFORE UPDATE ON public.user_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on both tables
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

-- RLS for user_entitlements: users can only read their own entitlement
CREATE POLICY "Users can view their own entitlement"
  ON public.user_entitlements
  FOR SELECT
  USING (auth.uid() = user_id);

-- No direct client writes for user_entitlements (service role only)
-- No INSERT/UPDATE/DELETE policies for authenticated users

-- RLS for daily_usage: users can only read their own usage
CREATE POLICY "Users can view their own daily usage"
  ON public.daily_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- No direct client writes for daily_usage (service role only)

-- Create function to check and increment daily usage (for edge functions)
CREATE OR REPLACE FUNCTION public.check_and_increment_usage(
  p_user_id uuid,
  p_date date,
  p_limit int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count int;
  v_allowed boolean;
BEGIN
  -- Get or create usage row with lock
  INSERT INTO daily_usage (user_id, date, messages_count)
  VALUES (p_user_id, p_date, 0)
  ON CONFLICT (user_id, date) DO NOTHING;
  
  -- Get current count with lock
  SELECT messages_count INTO v_current_count
  FROM daily_usage
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;
  
  -- Check if under limit (p_limit = -1 means unlimited)
  IF p_limit = -1 OR v_current_count < p_limit THEN
    -- Increment count
    UPDATE daily_usage
    SET messages_count = messages_count + 1
    WHERE user_id = p_user_id AND date = p_date;
    
    v_allowed := true;
    v_current_count := v_current_count + 1;
  ELSE
    v_allowed := false;
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'used', v_current_count,
    'limit', p_limit
  );
END;
$$;

-- Create function to get effective entitlement
CREATE OR REPLACE FUNCTION public.get_effective_entitlement(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entitlement user_entitlements%ROWTYPE;
  v_plan text;
  v_is_premium boolean;
BEGIN
  -- Try to get entitlement
  SELECT * INTO v_entitlement
  FROM user_entitlements
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- No entitlement record = free
    RETURN jsonb_build_object(
      'plan', 'free',
      'isPremium', false,
      'expiresAt', null,
      'flags', '{}'::jsonb
    );
  END IF;
  
  -- Check if premium is still valid
  IF v_entitlement.plan = 'premium' THEN
    IF v_entitlement.expires_at IS NULL OR v_entitlement.expires_at > now() THEN
      v_is_premium := true;
      v_plan := 'premium';
    ELSE
      -- Expired
      v_is_premium := false;
      v_plan := 'free';
    END IF;
  ELSE
    v_is_premium := false;
    v_plan := 'free';
  END IF;
  
  RETURN jsonb_build_object(
    'plan', v_plan,
    'isPremium', v_is_premium,
    'expiresAt', v_entitlement.expires_at,
    'flags', v_entitlement.flags,
    'note', v_entitlement.note
  );
END;
$$;