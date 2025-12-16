
-- Combined RPC: Initialize trial + check/increment usage in one atomic call
-- This eliminates the need for two separate database roundtrips

CREATE OR REPLACE FUNCTION public.init_and_check_usage(
  p_user_id uuid,
  p_trial_days integer DEFAULT 7,
  p_is_bypass boolean DEFAULT false,
  p_wants_search boolean DEFAULT false,
  p_wants_vision boolean DEFAULT false,
  p_wants_file boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_profile profiles%ROWTYPE;
  v_usage usage_counters%ROWTYPE;
  v_global global_usage_counters%ROWTYPE;
  v_is_beta_active boolean;
  v_daily_limit int;
  v_search_limit int;
  v_vision_limit int;
  v_file_limit int;
  v_global_search_limit int := 5000;
  v_global_vision_limit int := 5000;
  v_now timestamptz := now();
BEGIN
  -- =============================================
  -- STEP 1: Get/Create Trial (only if not bypass)
  -- =============================================
  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'profile_not_found');
  END IF;
  
  -- Initialize trial if not started (skip for bypass users)
  IF NOT p_is_bypass AND v_profile.trial_started_at IS NULL THEN
    UPDATE profiles
    SET trial_started_at = v_now,
        trial_expires_at = v_now + (p_trial_days || ' days')::interval,
        plan = 'beta_premium',
        updated_at = v_now
    WHERE user_id = p_user_id
    RETURNING * INTO v_profile;
  END IF;
  
  -- Auto-downgrade expired beta_premium to free
  IF v_profile.plan = 'beta_premium' AND v_profile.trial_expires_at IS NOT NULL AND v_profile.trial_expires_at <= v_now THEN
    UPDATE profiles SET plan = 'free', updated_at = v_now WHERE user_id = p_user_id;
    v_profile.plan := 'free';
  END IF;

  -- =============================================
  -- STEP 2: Bypass users skip all quota checks
  -- =============================================
  IF p_is_bypass THEN
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
      'plan', 'dev_unlimited',
      'remaining', jsonb_build_object('messages', -1, 'searches', -1, 'vision', -1, 'files', -1)
    );
  END IF;

  -- =============================================
  -- STEP 3: Calculate limits based on plan
  -- =============================================
  v_is_beta_active := v_profile.plan = 'beta_premium' AND v_profile.trial_expires_at IS NOT NULL AND v_profile.trial_expires_at > v_now;
  
  IF v_profile.plan = 'dev_unlimited' THEN
    v_daily_limit := -1;
    v_search_limit := -1;
    v_vision_limit := -1;
    v_file_limit := -1;
  ELSIF v_is_beta_active THEN
    v_daily_limit := 10;
    v_search_limit := 3;
    v_vision_limit := 3;
    v_file_limit := 2;
  ELSE
    -- free plan
    v_daily_limit := 5;
    v_search_limit := 0;
    v_vision_limit := 0;
    v_file_limit := 0;
  END IF;
  
  -- =============================================
  -- STEP 4: Get or create today's usage
  -- =============================================
  INSERT INTO usage_counters (user_id, date, messages_used, searches_used, vision_used, files_used)
  VALUES (p_user_id, v_today, 0, 0, 0, 0)
  ON CONFLICT (user_id, date) DO NOTHING;
  
  SELECT * INTO v_usage FROM usage_counters WHERE user_id = p_user_id AND date = v_today FOR UPDATE;
  
  -- =============================================
  -- STEP 5: Check all limits
  -- =============================================
  -- Check daily message limit
  IF v_daily_limit != -1 AND v_usage.messages_used >= v_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit_reached',
      'plan', v_profile.plan,
      'limits', jsonb_build_object('messages', v_daily_limit, 'searches', v_search_limit, 'vision', v_vision_limit, 'files', v_file_limit),
      'used', jsonb_build_object('messages', v_usage.messages_used, 'searches', v_usage.searches_used, 'vision', v_usage.vision_used, 'files', v_usage.files_used),
      'remaining', jsonb_build_object('messages', 0, 'searches', GREATEST(0, v_search_limit - v_usage.searches_used), 'vision', GREATEST(0, v_vision_limit - v_usage.vision_used), 'files', GREATEST(0, v_file_limit - v_usage.files_used)),
      'resets_at', (v_today + 1)::text
    );
  END IF;
  
  -- Check feature limits
  IF p_wants_search AND v_search_limit != -1 AND v_usage.searches_used >= v_search_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'search_limit_reached',
      'plan', v_profile.plan,
      'limits', jsonb_build_object('messages', v_daily_limit, 'searches', v_search_limit, 'vision', v_vision_limit, 'files', v_file_limit),
      'used', jsonb_build_object('messages', v_usage.messages_used, 'searches', v_usage.searches_used, 'vision', v_usage.vision_used, 'files', v_usage.files_used),
      'remaining', jsonb_build_object('messages', v_daily_limit - v_usage.messages_used, 'searches', 0, 'vision', GREATEST(0, v_vision_limit - v_usage.vision_used), 'files', GREATEST(0, v_file_limit - v_usage.files_used)),
      'resets_at', (v_today + 1)::text
    );
  END IF;
  
  IF p_wants_vision AND v_vision_limit != -1 AND v_usage.vision_used >= v_vision_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'vision_limit_reached',
      'plan', v_profile.plan,
      'limits', jsonb_build_object('messages', v_daily_limit, 'searches', v_search_limit, 'vision', v_vision_limit, 'files', v_file_limit),
      'used', jsonb_build_object('messages', v_usage.messages_used, 'searches', v_usage.searches_used, 'vision', v_usage.vision_used, 'files', v_usage.files_used),
      'remaining', jsonb_build_object('messages', v_daily_limit - v_usage.messages_used, 'searches', GREATEST(0, v_search_limit - v_usage.searches_used), 'vision', 0, 'files', GREATEST(0, v_file_limit - v_usage.files_used)),
      'resets_at', (v_today + 1)::text
    );
  END IF;
  
  IF p_wants_file AND v_file_limit != -1 AND v_usage.files_used >= v_file_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'file_limit_reached',
      'plan', v_profile.plan,
      'limits', jsonb_build_object('messages', v_daily_limit, 'searches', v_search_limit, 'vision', v_vision_limit, 'files', v_file_limit),
      'used', jsonb_build_object('messages', v_usage.messages_used, 'searches', v_usage.searches_used, 'vision', v_usage.vision_used, 'files', v_usage.files_used),
      'remaining', jsonb_build_object('messages', v_daily_limit - v_usage.messages_used, 'searches', GREATEST(0, v_search_limit - v_usage.searches_used), 'vision', GREATEST(0, v_vision_limit - v_usage.vision_used), 'files', 0),
      'resets_at', (v_today + 1)::text
    );
  END IF;
  
  -- =============================================
  -- STEP 6: Check global limits (non-bypass only)
  -- =============================================
  IF p_wants_search OR p_wants_vision THEN
    INSERT INTO global_usage_counters (date, searches_used, vision_used)
    VALUES (v_today, 0, 0)
    ON CONFLICT (date) DO NOTHING;
    
    SELECT * INTO v_global FROM global_usage_counters WHERE date = v_today FOR UPDATE;
    
    IF p_wants_search AND v_global.searches_used >= v_global_search_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'global_search_limit_reached',
        'plan', v_profile.plan,
        'resets_at', (v_today + 1)::text
      );
    END IF;
    
    IF p_wants_vision AND v_global.vision_used >= v_global_vision_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'global_vision_limit_reached',
        'plan', v_profile.plan,
        'resets_at', (v_today + 1)::text
      );
    END IF;
    
    -- Increment global counters
    UPDATE global_usage_counters SET
      searches_used = searches_used + CASE WHEN p_wants_search THEN 1 ELSE 0 END,
      vision_used = vision_used + CASE WHEN p_wants_vision THEN 1 ELSE 0 END
    WHERE date = v_today;
  END IF;
  
  -- =============================================
  -- STEP 7: All checks passed - increment usage
  -- =============================================
  UPDATE usage_counters SET
    messages_used = messages_used + 1,
    searches_used = searches_used + CASE WHEN p_wants_search THEN 1 ELSE 0 END,
    vision_used = vision_used + CASE WHEN p_wants_vision THEN 1 ELSE 0 END,
    files_used = files_used + CASE WHEN p_wants_file THEN 1 ELSE 0 END
  WHERE user_id = p_user_id AND date = v_today
  RETURNING * INTO v_usage;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'plan', v_profile.plan,
    'is_beta_active', v_is_beta_active,
    'limits', jsonb_build_object('messages', v_daily_limit, 'searches', v_search_limit, 'vision', v_vision_limit, 'files', v_file_limit),
    'used', jsonb_build_object('messages', v_usage.messages_used, 'searches', v_usage.searches_used, 'vision', v_usage.vision_used, 'files', v_usage.files_used),
    'remaining', jsonb_build_object(
      'messages', CASE WHEN v_daily_limit = -1 THEN -1 ELSE v_daily_limit - v_usage.messages_used END,
      'searches', CASE WHEN v_search_limit = -1 THEN -1 ELSE GREATEST(0, v_search_limit - v_usage.searches_used) END,
      'vision', CASE WHEN v_vision_limit = -1 THEN -1 ELSE GREATEST(0, v_vision_limit - v_usage.vision_used) END,
      'files', CASE WHEN v_file_limit = -1 THEN -1 ELSE GREATEST(0, v_file_limit - v_usage.files_used) END
    ),
    'resets_at', (v_today + 1)::text
  );
END;
$$;
