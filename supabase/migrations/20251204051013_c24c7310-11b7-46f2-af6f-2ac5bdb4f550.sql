-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS language text DEFAULT 'uz',
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'light';

-- Update daily_limit default based on plan logic
-- Free = 5, Premium = 200, Ultra = 500

-- Create atomic increment_daily_usage function
CREATE OR REPLACE FUNCTION public.increment_daily_usage(p_user_id uuid, p_today date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_allowed boolean;
  v_remaining int;
BEGIN
  -- Lock the row for update to prevent race conditions
  SELECT * INTO v_profile
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- If no profile found, return error
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'error', 'profile_not_found');
  END IF;
  
  -- Reset daily count if it's a new day
  IF v_profile.last_reset_date IS NULL OR v_profile.last_reset_date != p_today THEN
    UPDATE profiles
    SET messages_today = 0,
        last_reset_date = p_today,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    v_profile.messages_today := 0;
    v_profile.last_reset_date := p_today;
  END IF;
  
  -- Check if user can send more messages
  IF v_profile.messages_today < v_profile.daily_limit THEN
    -- Increment the counter
    UPDATE profiles
    SET messages_today = messages_today + 1,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    v_allowed := true;
    v_remaining := v_profile.daily_limit - v_profile.messages_today - 1;
  ELSE
    v_allowed := false;
    v_remaining := 0;
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'remaining', v_remaining,
    'used', v_profile.messages_today + (CASE WHEN v_allowed THEN 1 ELSE 0 END),
    'limit', v_profile.daily_limit,
    'plan', v_profile.plan
  );
END;
$$;

-- Function to sync daily_limit based on plan
CREATE OR REPLACE FUNCTION public.sync_plan_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sync daily_limit when plan changes
  IF NEW.plan = 'free' THEN
    NEW.daily_limit := 5;
  ELSIF NEW.plan = 'premium' OR NEW.plan = 'monthly' THEN
    NEW.daily_limit := 200;
  ELSIF NEW.plan = 'ultra' OR NEW.plan = 'yearly' THEN
    NEW.daily_limit := 500;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync limits on plan change
DROP TRIGGER IF EXISTS sync_plan_limits_trigger ON profiles;
CREATE TRIGGER sync_plan_limits_trigger
BEFORE INSERT OR UPDATE OF plan ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_plan_limits();

-- Update existing profiles to have correct daily_limit based on plan
UPDATE profiles
SET daily_limit = CASE 
  WHEN plan = 'free' THEN 5
  WHEN plan IN ('premium', 'monthly') THEN 200
  WHEN plan IN ('ultra', 'yearly') THEN 500
  ELSE 5
END
WHERE daily_limit IS NULL OR daily_limit = 5;