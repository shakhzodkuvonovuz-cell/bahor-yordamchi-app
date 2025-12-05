-- Beta Premium Trial system

-- Add trial columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
ADD COLUMN IF NOT EXISTS trial_expires_at timestamptz;

-- Create usage_counters table for per-user daily tracking
CREATE TABLE IF NOT EXISTS public.usage_counters (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  messages_used int DEFAULT 0 NOT NULL,
  searches_used int DEFAULT 0 NOT NULL,
  vision_used int DEFAULT 0 NOT NULL,
  files_used int DEFAULT 0 NOT NULL,
  PRIMARY KEY (user_id, date)
);

-- Enable RLS on usage_counters
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

-- Users can only read their own usage
CREATE POLICY "Users can view their own usage" ON public.usage_counters
  FOR SELECT USING (auth.uid() = user_id);

-- Create global_usage_counters table for project-wide caps
CREATE TABLE IF NOT EXISTS public.global_usage_counters (
  date date PRIMARY KEY,
  searches_used int DEFAULT 0 NOT NULL,
  vision_used int DEFAULT 0 NOT NULL
);

-- Enable RLS - only service role can modify
ALTER TABLE public.global_usage_counters ENABLE ROW LEVEL SECURITY;

-- Anyone can read global counters
CREATE POLICY "Anyone can read global usage" ON public.global_usage_counters
  FOR SELECT USING (true);

-- RPC: Get or create trial for user
CREATE OR REPLACE FUNCTION public.get_or_create_trial(p_user_id uuid, p_trial_days int DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'profile_not_found');
  END IF;
  
  -- If trial not started, initialize it
  IF v_profile.trial_started_at IS NULL THEN
    UPDATE profiles
    SET trial_started_at = v_now,
        trial_expires_at = v_now + (p_trial_days || ' days')::interval,
        updated_at = v_now
    WHERE user_id = p_user_id
    RETURNING * INTO v_profile;
  END IF;
  
  RETURN jsonb_build_object(
    'trial_started_at', v_profile.trial_started_at,
    'trial_expires_at', v_profile.trial_expires_at,
    'is_trial_active', v_profile.trial_expires_at > v_now,
    'days_remaining', GREATEST(0, EXTRACT(DAY FROM v_profile.trial_expires_at - v_now)::int)
  );
END;
$$;

-- RPC: Check and increment usage with all quotas
CREATE OR REPLACE FUNCTION public.check_and_increment_usage(
  p_user_id uuid,
  p_wants_search boolean DEFAULT false,
  p_wants_vision boolean DEFAULT false,
  p_wants_file boolean DEFAULT false,
  p_is_bypass boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_profile profiles%ROWTYPE;
  v_usage usage_counters%ROWTYPE;
  v_global global_usage_counters%ROWTYPE;
  v_is_trial_active boolean;
  v_is_premium boolean;
  v_daily_limit int;
  v_search_limit int := 3;
  v_vision_limit int := 3;
  v_file_limit int := 2;
  v_global_search_limit int := 5000;
  v_global_vision_limit int := 5000;
  v_reason text := null;
BEGIN
  -- Bypass users skip all checks
  IF p_is_bypass THEN
    -- Still track usage for analytics but don't enforce
    INSERT INTO usage_counters (user_id, date, messages_used, searches_used, vision_used, files_used)
    VALUES (p_user_id, v_today, 1, 
            CASE WHEN p_wants_search THEN 1 ELSE 0 END,
            CASE WHEN p_wants_vision THEN 1 ELSE 0 END,
            CASE WHEN p_wants_file THEN 1 ELSE 0 END)
    ON CONFLICT (user_id, date) DO UPDATE SET
      messages_used = usage_counters.messages_used + 1,
      searches_used = usage_counters.searches_used + CASE WHEN p_wants_search THEN 1 ELSE 0 END,
      vision_used = usage_counters.vision_used + CASE WHEN p_wants_vision THEN 1 ELSE 0 END,
      files_used = usage_counters.files_used + CASE WHEN p_wants_file THEN 1 ELSE 0 END;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'is_bypass', true,
      'remaining', jsonb_build_object('messages', -1, 'searches', -1, 'vision', -1, 'files', -1)
    );
  END IF;

  -- Get profile and determine plan
  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'profile_not_found');
  END IF;
  
  -- Check trial status
  v_is_trial_active := v_profile.trial_expires_at IS NOT NULL AND v_profile.trial_expires_at > now();
  v_is_premium := v_profile.plan IN ('premium', 'ultra');
  
  -- Set daily message limit based on status
  IF v_is_premium THEN
    v_daily_limit := 200;
    v_search_limit := 50;
    v_vision_limit := 50;
    v_file_limit := 20;
  ELSIF v_is_trial_active THEN
    v_daily_limit := 10;
    v_search_limit := 3;
    v_vision_limit := 3;
    v_file_limit := 2;
  ELSE
    -- Free plan
    v_daily_limit := 5;
    v_search_limit := 0;
    v_vision_limit := 0;
    v_file_limit := 0;
  END IF;
  
  -- Get or create today's usage
  INSERT INTO usage_counters (user_id, date, messages_used, searches_used, vision_used, files_used)
  VALUES (p_user_id, v_today, 0, 0, 0, 0)
  ON CONFLICT (user_id, date) DO NOTHING;
  
  SELECT * INTO v_usage FROM usage_counters WHERE user_id = p_user_id AND date = v_today FOR UPDATE;
  
  -- Check daily message limit
  IF v_usage.messages_used >= v_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit_reached',
      'limits', jsonb_build_object('messages', v_daily_limit, 'searches', v_search_limit, 'vision', v_vision_limit, 'files', v_file_limit),
      'used', jsonb_build_object('messages', v_usage.messages_used, 'searches', v_usage.searches_used, 'vision', v_usage.vision_used, 'files', v_usage.files_used),
      'remaining', jsonb_build_object('messages', 0, 'searches', GREATEST(0, v_search_limit - v_usage.searches_used), 'vision', GREATEST(0, v_vision_limit - v_usage.vision_used), 'files', GREATEST(0, v_file_limit - v_usage.files_used)),
      'resets_at', (v_today + 1)::text
    );
  END IF;
  
  -- Check per-feature limits
  IF p_wants_search AND v_usage.searches_used >= v_search_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'search_limit_reached',
      'limits', jsonb_build_object('messages', v_daily_limit, 'searches', v_search_limit, 'vision', v_vision_limit, 'files', v_file_limit),
      'used', jsonb_build_object('messages', v_usage.messages_used, 'searches', v_usage.searches_used, 'vision', v_usage.vision_used, 'files', v_usage.files_used),
      'remaining', jsonb_build_object('messages', v_daily_limit - v_usage.messages_used, 'searches', 0, 'vision', GREATEST(0, v_vision_limit - v_usage.vision_used), 'files', GREATEST(0, v_file_limit - v_usage.files_used)),
      'resets_at', (v_today + 1)::text
    );
  END IF;
  
  IF p_wants_vision AND v_usage.vision_used >= v_vision_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'vision_limit_reached',
      'limits', jsonb_build_object('messages', v_daily_limit, 'searches', v_search_limit, 'vision', v_vision_limit, 'files', v_file_limit),
      'used', jsonb_build_object('messages', v_usage.messages_used, 'searches', v_usage.searches_used, 'vision', v_usage.vision_used, 'files', v_usage.files_used),
      'remaining', jsonb_build_object('messages', v_daily_limit - v_usage.messages_used, 'searches', GREATEST(0, v_search_limit - v_usage.searches_used), 'vision', 0, 'files', GREATEST(0, v_file_limit - v_usage.files_used)),
      'resets_at', (v_today + 1)::text
    );
  END IF;
  
  IF p_wants_file AND v_usage.files_used >= v_file_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'file_limit_reached',
      'limits', jsonb_build_object('messages', v_daily_limit, 'searches', v_search_limit, 'vision', v_vision_limit, 'files', v_file_limit),
      'used', jsonb_build_object('messages', v_usage.messages_used, 'searches', v_usage.searches_used, 'vision', v_usage.vision_used, 'files', v_usage.files_used),
      'remaining', jsonb_build_object('messages', v_daily_limit - v_usage.messages_used, 'searches', GREATEST(0, v_search_limit - v_usage.searches_used), 'vision', GREATEST(0, v_vision_limit - v_usage.vision_used), 'files', 0),
      'resets_at', (v_today + 1)::text
    );
  END IF;
  
  -- Check global limits (only for non-premium features)
  IF p_wants_search OR p_wants_vision THEN
    INSERT INTO global_usage_counters (date, searches_used, vision_used)
    VALUES (v_today, 0, 0)
    ON CONFLICT (date) DO NOTHING;
    
    SELECT * INTO v_global FROM global_usage_counters WHERE date = v_today FOR UPDATE;
    
    IF p_wants_search AND v_global.searches_used >= v_global_search_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'global_search_limit_reached',
        'limits', jsonb_build_object('messages', v_daily_limit, 'searches', v_search_limit, 'vision', v_vision_limit, 'files', v_file_limit),
        'used', jsonb_build_object('messages', v_usage.messages_used, 'searches', v_usage.searches_used, 'vision', v_usage.vision_used, 'files', v_usage.files_used),
        'remaining', jsonb_build_object('messages', v_daily_limit - v_usage.messages_used, 'searches', 0, 'vision', GREATEST(0, v_vision_limit - v_usage.vision_used), 'files', GREATEST(0, v_file_limit - v_usage.files_used)),
        'resets_at', (v_today + 1)::text
      );
    END IF;
    
    IF p_wants_vision AND v_global.vision_used >= v_global_vision_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'global_vision_limit_reached',
        'limits', jsonb_build_object('messages', v_daily_limit, 'searches', v_search_limit, 'vision', v_vision_limit, 'files', v_file_limit),
        'used', jsonb_build_object('messages', v_usage.messages_used, 'searches', v_usage.searches_used, 'vision', v_usage.vision_used, 'files', v_usage.files_used),
        'remaining', jsonb_build_object('messages', v_daily_limit - v_usage.messages_used, 'searches', GREATEST(0, v_search_limit - v_usage.searches_used), 'vision', 0, 'files', GREATEST(0, v_file_limit - v_usage.files_used)),
        'resets_at', (v_today + 1)::text
      );
    END IF;
    
    -- Increment global counters
    UPDATE global_usage_counters SET
      searches_used = searches_used + CASE WHEN p_wants_search THEN 1 ELSE 0 END,
      vision_used = vision_used + CASE WHEN p_wants_vision THEN 1 ELSE 0 END
    WHERE date = v_today;
  END IF;
  
  -- All checks passed - increment user counters
  UPDATE usage_counters SET
    messages_used = messages_used + 1,
    searches_used = searches_used + CASE WHEN p_wants_search THEN 1 ELSE 0 END,
    vision_used = vision_used + CASE WHEN p_wants_vision THEN 1 ELSE 0 END,
    files_used = files_used + CASE WHEN p_wants_file THEN 1 ELSE 0 END
  WHERE user_id = p_user_id AND date = v_today
  RETURNING * INTO v_usage;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'is_trial_active', v_is_trial_active,
    'is_premium', v_is_premium,
    'limits', jsonb_build_object('messages', v_daily_limit, 'searches', v_search_limit, 'vision', v_vision_limit, 'files', v_file_limit),
    'used', jsonb_build_object('messages', v_usage.messages_used, 'searches', v_usage.searches_used, 'vision', v_usage.vision_used, 'files', v_usage.files_used),
    'remaining', jsonb_build_object(
      'messages', v_daily_limit - v_usage.messages_used,
      'searches', GREATEST(0, v_search_limit - v_usage.searches_used),
      'vision', GREATEST(0, v_vision_limit - v_usage.vision_used),
      'files', GREATEST(0, v_file_limit - v_usage.files_used)
    ),
    'resets_at', (v_today + 1)::text
  );
END;
$$;

-- RPC: Get user trial and usage status (for frontend display)
CREATE OR REPLACE FUNCTION public.get_trial_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_usage usage_counters%ROWTYPE;
  v_today date := CURRENT_DATE;
  v_is_trial_active boolean;
  v_is_premium boolean;
  v_daily_limit int;
  v_search_limit int;
  v_vision_limit int;
  v_file_limit int;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'profile_not_found');
  END IF;
  
  v_is_trial_active := v_profile.trial_expires_at IS NOT NULL AND v_profile.trial_expires_at > now();
  v_is_premium := v_profile.plan IN ('premium', 'ultra');
  
  IF v_is_premium THEN
    v_daily_limit := 200;
    v_search_limit := 50;
    v_vision_limit := 50;
    v_file_limit := 20;
  ELSIF v_is_trial_active THEN
    v_daily_limit := 10;
    v_search_limit := 3;
    v_vision_limit := 3;
    v_file_limit := 2;
  ELSE
    v_daily_limit := 5;
    v_search_limit := 0;
    v_vision_limit := 0;
    v_file_limit := 0;
  END IF;
  
  SELECT * INTO v_usage FROM usage_counters WHERE user_id = p_user_id AND date = v_today;
  
  RETURN jsonb_build_object(
    'plan', v_profile.plan,
    'is_trial_active', v_is_trial_active,
    'is_premium', v_is_premium,
    'trial_started_at', v_profile.trial_started_at,
    'trial_expires_at', v_profile.trial_expires_at,
    'days_remaining', CASE WHEN v_is_trial_active THEN GREATEST(0, EXTRACT(DAY FROM v_profile.trial_expires_at - now())::int) ELSE 0 END,
    'limits', jsonb_build_object('messages', v_daily_limit, 'searches', v_search_limit, 'vision', v_vision_limit, 'files', v_file_limit),
    'used', jsonb_build_object(
      'messages', COALESCE(v_usage.messages_used, 0),
      'searches', COALESCE(v_usage.searches_used, 0),
      'vision', COALESCE(v_usage.vision_used, 0),
      'files', COALESCE(v_usage.files_used, 0)
    ),
    'remaining', jsonb_build_object(
      'messages', v_daily_limit - COALESCE(v_usage.messages_used, 0),
      'searches', GREATEST(0, v_search_limit - COALESCE(v_usage.searches_used, 0)),
      'vision', GREATEST(0, v_vision_limit - COALESCE(v_usage.vision_used, 0)),
      'files', GREATEST(0, v_file_limit - COALESCE(v_usage.files_used, 0))
    ),
    'resets_at', (v_today + 1)::text
  );
END;
$$;