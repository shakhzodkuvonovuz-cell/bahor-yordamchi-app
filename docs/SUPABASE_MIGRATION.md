# Supabase Migration Guide

## Overview

This guide helps you migrate Bahor AI from Lovable Cloud to your own Supabase project.

## Step 1: Environment Variables

The application already uses environment variables. Update your `.env` file:

```env
VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key-here"
VITE_SUPABASE_PROJECT_ID="YOUR_PROJECT_ID"
VITE_APP_VERSION="1.0.0-beta"
```

## Step 2: Edge Function Secrets

Set these secrets in your Supabase Dashboard → Settings → Edge Functions → Secrets:

| Secret Name | Purpose |
|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin operations |
| `SUPABASE_ANON_KEY` | Anon key for public operations |
| `DEEPSEEK_API_KEY` | DeepSeek AI API key |
| `GOOGLE_SEARCH_API_KEY` | Google Custom Search API |
| `GOOGLE_CX` | Google Custom Search Engine ID |
| `FIREWORKS_API_KEY` | Fireworks AI for images |
| `PIAPI_API_KEY` | PiAPI for fast image generation |
| `REPLICATE_API_TOKEN` | Replicate fallback for images |
| `DEV_UNLIMITED_EMAILS` | Comma-separated dev emails |
| `ADMIN_EMAILS` | Comma-separated admin emails |

## Step 3: Database Schema

Run the following SQL in your Supabase SQL Editor:

---

### Core Tables

```sql
-- =============================================
-- PROFILES TABLE (User data & plan info)
-- =============================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free',
  daily_limit INTEGER DEFAULT 5,
  messages_today INTEGER DEFAULT 0,
  last_reset_date DATE,
  trial_started_at TIMESTAMPTZ,
  trial_expires_at TIMESTAMPTZ,
  language TEXT DEFAULT 'uz',
  theme TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);

-- =============================================
-- PROFILES_PRIVATE TABLE (Sensitive PII)
-- =============================================
CREATE TABLE public.profiles_private (
  user_id UUID NOT NULL PRIMARY KEY,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own private profile"
  ON public.profiles_private FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own private profile"
  ON public.profiles_private FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own private profile"
  ON public.profiles_private FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own private profile"
  ON public.profiles_private FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- USAGE_COUNTERS TABLE (Daily usage tracking)
-- =============================================
CREATE TABLE public.usage_counters (
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  messages_used INTEGER NOT NULL DEFAULT 0,
  searches_used INTEGER NOT NULL DEFAULT 0,
  vision_used INTEGER NOT NULL DEFAULT 0,
  files_used INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
  ON public.usage_counters FOR SELECT
  USING (auth.uid() = user_id);

-- Note: INSERT/UPDATE/DELETE restricted to service_role (edge functions)

-- Index for date queries
CREATE INDEX idx_usage_counters_date ON public.usage_counters(date);

-- =============================================
-- CHAT_THREADS TABLE
-- =============================================
CREATE TABLE public.chat_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Yangi chat',
  mode TEXT NOT NULL DEFAULT 'general',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  message_count INTEGER DEFAULT 0,
  last_message_preview TEXT,
  summary TEXT,
  summary_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own threads"
  ON public.chat_threads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own threads"
  ON public.chat_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own threads"
  ON public.chat_threads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own threads"
  ON public.chat_threads FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_chat_threads_user_updated ON public.chat_threads(user_id, updated_at DESC);

-- =============================================
-- CHAT_MESSAGES TABLE
-- =============================================
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  model TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  reaction TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON public.chat_messages FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_chat_messages_thread ON public.chat_messages(thread_id, created_at ASC);

-- =============================================
-- GLOBAL_USAGE_COUNTERS (System-wide limits)
-- =============================================
CREATE TABLE public.global_usage_counters (
  date DATE NOT NULL PRIMARY KEY,
  searches_used INTEGER NOT NULL DEFAULT 0,
  vision_used INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.global_usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only access"
  ON public.global_usage_counters FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

---

### Database Functions

```sql
-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply to profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- SYNC PLAN LIMITS TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.sync_plan_limits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan = 'free' THEN
    NEW.daily_limit := 5;
  ELSIF NEW.plan = 'beta_premium' THEN
    NEW.daily_limit := 10;
  ELSIF NEW.plan = 'premium' OR NEW.plan = 'monthly' THEN
    NEW.daily_limit := 200;
  ELSIF NEW.plan = 'ultra' OR NEW.plan = 'yearly' THEN
    NEW.daily_limit := 500;
  ELSIF NEW.plan = 'dev_unlimited' THEN
    NEW.daily_limit := -1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER sync_profile_plan_limits
  BEFORE UPDATE OF plan ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_plan_limits();

-- =============================================
-- NORMALIZE MESSAGE PREVIEW
-- =============================================
CREATE OR REPLACE FUNCTION public.normalize_preview(content TEXT, max_length INTEGER DEFAULT 140)
RETURNS TEXT AS $$
DECLARE
  cleaned TEXT;
BEGIN
  cleaned := regexp_replace(content, '\*\*|__|~~|`{1,3}|#{1,6}\s*|>\s*|\[([^\]]+)\]\([^)]+\)', '\1', 'g');
  cleaned := regexp_replace(cleaned, '\s+', ' ', 'g');
  cleaned := trim(cleaned);
  IF length(cleaned) > max_length THEN
    cleaned := left(cleaned, max_length - 3) || '...';
  END IF;
  RETURN cleaned;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- =============================================
-- UPDATE THREAD ON NEW MESSAGE
-- =============================================
CREATE OR REPLACE FUNCTION public.update_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_threads
  SET 
    message_count = message_count + 1,
    updated_at = now(),
    last_message_preview = normalize_preview(NEW.content, 140)
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_chat_message_insert
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_thread_on_message();

-- =============================================
-- INIT AND CHECK USAGE (Core quota logic)
-- =============================================
CREATE OR REPLACE FUNCTION public.init_and_check_usage(
  p_user_id UUID,
  p_trial_days INTEGER DEFAULT 7,
  p_is_bypass BOOLEAN DEFAULT false,
  p_wants_search BOOLEAN DEFAULT false,
  p_wants_vision BOOLEAN DEFAULT false,
  p_wants_file BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_profile profiles%ROWTYPE;
  v_usage usage_counters%ROWTYPE;
  v_global global_usage_counters%ROWTYPE;
  v_is_beta_active BOOLEAN;
  v_daily_limit INT;
  v_search_limit INT;
  v_vision_limit INT;
  v_file_limit INT;
  v_global_search_limit INT := 5000;
  v_global_vision_limit INT := 5000;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Get/create profile
  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'profile_not_found');
  END IF;
  
  -- Initialize trial if not started
  IF NOT p_is_bypass AND v_profile.trial_started_at IS NULL THEN
    UPDATE profiles
    SET trial_started_at = v_now,
        trial_expires_at = v_now + (p_trial_days || ' days')::interval,
        plan = 'beta_premium',
        updated_at = v_now
    WHERE user_id = p_user_id
    RETURNING * INTO v_profile;
  END IF;
  
  -- Auto-downgrade expired trial
  IF v_profile.plan = 'beta_premium' AND v_profile.trial_expires_at IS NOT NULL AND v_profile.trial_expires_at <= v_now THEN
    UPDATE profiles SET plan = 'free', updated_at = v_now WHERE user_id = p_user_id;
    v_profile.plan := 'free';
  END IF;

  -- Bypass users skip all quota checks
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

  -- Calculate limits based on plan
  v_is_beta_active := v_profile.plan = 'beta_premium' AND v_profile.trial_expires_at IS NOT NULL AND v_profile.trial_expires_at > v_now;
  
  IF v_profile.plan = 'dev_unlimited' THEN
    v_daily_limit := -1; v_search_limit := -1; v_vision_limit := -1; v_file_limit := -1;
  ELSIF v_is_beta_active THEN
    v_daily_limit := 10; v_search_limit := 3; v_vision_limit := 3; v_file_limit := 2;
  ELSE
    v_daily_limit := 5; v_search_limit := 0; v_vision_limit := 0; v_file_limit := 0;
  END IF;
  
  -- Get or create today's usage
  INSERT INTO usage_counters (user_id, date, messages_used, searches_used, vision_used, files_used)
  VALUES (p_user_id, v_today, 0, 0, 0, 0)
  ON CONFLICT (user_id, date) DO NOTHING;
  
  SELECT * INTO v_usage FROM usage_counters WHERE user_id = p_user_id AND date = v_today FOR UPDATE;
  
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
  
  -- Check feature limits (search, vision, files)
  IF p_wants_search AND v_search_limit != -1 AND v_usage.searches_used >= v_search_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'search_limit_reached', 'plan', v_profile.plan);
  END IF;
  
  IF p_wants_vision AND v_vision_limit != -1 AND v_usage.vision_used >= v_vision_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'vision_limit_reached', 'plan', v_profile.plan);
  END IF;
  
  IF p_wants_file AND v_file_limit != -1 AND v_usage.files_used >= v_file_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'file_limit_reached', 'plan', v_profile.plan);
  END IF;
  
  -- Check global limits
  IF p_wants_search OR p_wants_vision THEN
    INSERT INTO global_usage_counters (date, searches_used, vision_used)
    VALUES (v_today, 0, 0)
    ON CONFLICT (date) DO NOTHING;
    
    SELECT * INTO v_global FROM global_usage_counters WHERE date = v_today FOR UPDATE;
    
    IF p_wants_search AND v_global.searches_used >= v_global_search_limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'global_search_limit_reached');
    END IF;
    
    IF p_wants_vision AND v_global.vision_used >= v_global_vision_limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'global_vision_limit_reached');
    END IF;
    
    UPDATE global_usage_counters SET
      searches_used = searches_used + CASE WHEN p_wants_search THEN 1 ELSE 0 END,
      vision_used = vision_used + CASE WHEN p_wants_vision THEN 1 ELSE 0 END
    WHERE date = v_today;
  END IF;
  
  -- All checks passed - increment usage
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- GET TRIAL STATUS
-- =============================================
CREATE OR REPLACE FUNCTION public.get_trial_status(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_usage usage_counters%ROWTYPE;
  v_today DATE := CURRENT_DATE;
  v_is_beta_active BOOLEAN;
  v_daily_limit INT;
  v_search_limit INT;
  v_vision_limit INT;
  v_file_limit INT;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'profile_not_found');
  END IF;
  
  -- Auto-downgrade expired trial
  IF v_profile.plan = 'beta_premium' AND v_profile.trial_expires_at IS NOT NULL AND v_profile.trial_expires_at <= v_now THEN
    UPDATE profiles SET plan = 'free', updated_at = v_now WHERE user_id = p_user_id;
    v_profile.plan := 'free';
  END IF;
  
  v_is_beta_active := v_profile.plan = 'beta_premium' AND v_profile.trial_expires_at IS NOT NULL AND v_profile.trial_expires_at > v_now;
  
  IF v_profile.plan = 'dev_unlimited' THEN
    v_daily_limit := -1; v_search_limit := -1; v_vision_limit := -1; v_file_limit := -1;
  ELSIF v_is_beta_active THEN
    v_daily_limit := 10; v_search_limit := 3; v_vision_limit := 3; v_file_limit := 2;
  ELSE
    v_daily_limit := 5; v_search_limit := 0; v_vision_limit := 0; v_file_limit := 0;
  END IF;
  
  SELECT * INTO v_usage FROM usage_counters WHERE user_id = p_user_id AND date = v_today;
  
  RETURN jsonb_build_object(
    'plan', v_profile.plan,
    'is_beta_active', v_is_beta_active,
    'beta_expires_at', v_profile.trial_expires_at,
    'days_remaining', CASE WHEN v_is_beta_active THEN GREATEST(0, EXTRACT(DAY FROM v_profile.trial_expires_at - v_now)::int) ELSE 0 END,
    'limits', jsonb_build_object('messages', v_daily_limit, 'searches', v_search_limit, 'vision', v_vision_limit, 'files', v_file_limit),
    'used', jsonb_build_object(
      'messages', COALESCE(v_usage.messages_used, 0),
      'searches', COALESCE(v_usage.searches_used, 0),
      'vision', COALESCE(v_usage.vision_used, 0),
      'files', COALESCE(v_usage.files_used, 0)
    ),
    'remaining', jsonb_build_object(
      'messages', CASE WHEN v_daily_limit = -1 THEN -1 ELSE v_daily_limit - COALESCE(v_usage.messages_used, 0) END,
      'searches', CASE WHEN v_search_limit = -1 THEN -1 ELSE GREATEST(0, v_search_limit - COALESCE(v_usage.searches_used, 0)) END,
      'vision', CASE WHEN v_vision_limit = -1 THEN -1 ELSE GREATEST(0, v_vision_limit - COALESCE(v_usage.vision_used, 0)) END,
      'files', CASE WHEN v_file_limit = -1 THEN -1 ELSE GREATEST(0, v_file_limit - COALESCE(v_usage.files_used, 0)) END
    ),
    'resets_at', (v_today + 1)::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

### Secure View for Profile Data

```sql
-- Combined view for current user's profile + private data
CREATE OR REPLACE VIEW public.my_profile AS
SELECT 
  p.id,
  p.user_id,
  p.first_name,
  p.last_name,
  p.full_name,
  p.avatar_url,
  p.plan,
  p.daily_limit,
  p.messages_today,
  p.last_reset_date,
  p.trial_started_at,
  p.trial_expires_at,
  p.language,
  p.theme,
  p.created_at,
  p.updated_at,
  pp.phone
FROM public.profiles p
LEFT JOIN public.profiles_private pp ON p.user_id = pp.user_id
WHERE p.user_id = auth.uid();

-- Public display view (for showing names in circles, etc.)
CREATE OR REPLACE VIEW public.profile_display AS
SELECT 
  user_id,
  first_name,
  last_name,
  full_name,
  avatar_url
FROM public.profiles;
```

---

### Storage Buckets

Create these buckets in Supabase Dashboard → Storage:

| Bucket | Public | Purpose |
|--------|--------|---------|
| `avatars` | Yes | User profile photos |
| `chat-attachments` | Yes | Chat file uploads |
| `user-files` | No | Document conversions |
| `feedback-screenshots` | No | Bug report screenshots |

---

## Step 4: Deploy Edge Functions

Copy the `supabase/functions/` folder to your project and deploy:

```bash
supabase functions deploy chat
supabase functions deploy analyze-image
supabase functions deploy image-generate
supabase functions deploy speech-to-text
# ... deploy all functions
```

---

## Step 5: Enable Auth

In Supabase Dashboard → Authentication → Settings:
- Enable Email auth
- Enable "Confirm email" toggle OFF for faster testing
- Add your redirect URLs

---

## Verification Checklist

- [ ] Environment variables set in `.env`
- [ ] All secrets configured in Edge Function settings
- [ ] Database tables created with RLS policies
- [ ] Triggers and functions created
- [ ] Storage buckets created
- [ ] Edge functions deployed
- [ ] Auth configured
