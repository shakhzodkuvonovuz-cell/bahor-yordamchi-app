import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Check, Download, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// SQL Schema sections for easy copy
const SQL_SECTIONS = {
  tables: `-- =============================================
-- BAHOR AI - COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Part 1: Core User Tables
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.profiles_private (
  user_id UUID NOT NULL PRIMARY KEY,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own private profile" ON public.profiles_private FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own private profile" ON public.profiles_private FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own private profile" ON public.profiles_private FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own private profile" ON public.profiles_private FOR DELETE USING (auth.uid() = user_id);

-- Part 2: Usage Tracking
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
CREATE POLICY "Users can view their own usage" ON public.usage_counters FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE public.global_usage_counters (
  date DATE NOT NULL PRIMARY KEY,
  searches_used INTEGER NOT NULL DEFAULT 0,
  vision_used INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.global_usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only access" ON public.global_usage_counters FOR ALL USING (auth.role() = 'service_role');

-- Part 3: Chat Tables
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

CREATE POLICY "Users can view their own threads" ON public.chat_threads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own threads" ON public.chat_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own threads" ON public.chat_threads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own threads" ON public.chat_threads FOR DELETE USING (auth.uid() = user_id);

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

CREATE POLICY "Users can view their own messages" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own messages" ON public.chat_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own messages" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.chat_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  bucket TEXT NOT NULL DEFAULT 'chat-attachments',
  path TEXT NOT NULL,
  mime_type TEXT,
  original_name TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own attachments" ON public.chat_attachments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own attachments" ON public.chat_attachments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own attachments" ON public.chat_attachments FOR DELETE USING (auth.uid() = user_id);`,

  storage: `-- =============================================
-- STORAGE BUCKETS
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('chat-attachments', 'chat-attachments', true, 52428800, NULL),
  ('user-files', 'user-files', false, 104857600, NULL),
  ('feedback-screenshots', 'feedback-screenshots', false, 10485760, ARRAY['image/jpeg', 'image/png']),
  ('space-files', 'space-files', false, 104857600, NULL),
  ('space-chat-files', 'space-chat-files', false, 52428800, NULL),
  ('video-generations', 'video-generations', false, 524288000, ARRAY['video/mp4', 'video/webm']),
  ('video-assets', 'video-assets', false, 104857600, NULL)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Chat attachments are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments');
CREATE POLICY "Users can upload their own chat attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own chat attachments" ON storage.objects FOR DELETE USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own user files" ON storage.objects FOR SELECT USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload their own user files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own user files" ON storage.objects FOR DELETE USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload feedback screenshots" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'feedback-screenshots' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own video generations" ON storage.objects FOR SELECT USING (bucket_id = 'video-generations' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload their own video generations" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'video-generations' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own video generations" ON storage.objects FOR DELETE USING (bucket_id = 'video-generations' AND auth.uid()::text = (storage.foldername(name))[1]);`,

  functions: `-- =============================================
-- CRITICAL DATABASE FUNCTIONS
-- =============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sync plan limits trigger
CREATE OR REPLACE FUNCTION public.sync_plan_limits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan = 'free' THEN
    NEW.daily_limit := 5;
  ELSIF NEW.plan = 'beta_premium' THEN
    NEW.daily_limit := 10;
  ELSIF NEW.plan IN ('premium', 'monthly') THEN
    NEW.daily_limit := 200;
  ELSIF NEW.plan IN ('ultra', 'yearly') THEN
    NEW.daily_limit := 500;
  ELSIF NEW.plan = 'dev_unlimited' THEN
    NEW.daily_limit := -1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER sync_profile_plan_limits
  BEFORE INSERT OR UPDATE OF plan ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_plan_limits();

-- Update thread on message trigger
CREATE OR REPLACE FUNCTION public.update_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_threads
  SET message_count = message_count + 1,
      updated_at = now(),
      last_message_preview = LEFT(NEW.content, 140)
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_chat_message_insert
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_thread_on_message();

-- Init and check usage (quota management)
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
  v_is_beta_active BOOLEAN;
  v_daily_limit INT;
  v_search_limit INT;
  v_vision_limit INT;
  v_file_limit INT;
  v_now TIMESTAMPTZ := now();
BEGIN
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
  
  -- Auto-downgrade expired beta
  IF v_profile.plan = 'beta_premium' AND v_profile.trial_expires_at <= v_now THEN
    UPDATE profiles SET plan = 'free', updated_at = v_now WHERE user_id = p_user_id;
    v_profile.plan := 'free';
  END IF;

  -- Bypass users skip quota checks
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
    
    RETURN jsonb_build_object('allowed', true, 'is_bypass', true, 'plan', 'dev_unlimited');
  END IF;

  -- Calculate limits based on plan
  v_is_beta_active := v_profile.plan = 'beta_premium' AND v_profile.trial_expires_at > v_now;
  
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
  
  -- Check limits
  IF v_daily_limit != -1 AND v_usage.messages_used >= v_daily_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'daily_limit_reached', 'plan', v_profile.plan);
  END IF;
  
  -- Increment usage
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
    'used', jsonb_build_object('messages', v_usage.messages_used, 'searches', v_usage.searches_used),
    'remaining', jsonb_build_object('messages', CASE WHEN v_daily_limit = -1 THEN -1 ELSE v_daily_limit - v_usage.messages_used END)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;`
};

const SECRETS_LIST = [
  { name: 'SUPABASE_URL', required: true, description: 'Your Supabase project URL' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: true, description: 'Service role key for admin operations' },
  { name: 'SUPABASE_ANON_KEY', required: true, description: 'Anon key for public operations' },
  { name: 'DEEPSEEK_API_KEY', required: true, description: 'DeepSeek AI API key' },
  { name: 'GOOGLE_SEARCH_API_KEY', required: false, description: 'Google Custom Search API' },
  { name: 'GOOGLE_CX', required: false, description: 'Google Custom Search Engine ID' },
  { name: 'FIREWORKS_API_KEY', required: false, description: 'Fireworks AI for images' },
  { name: 'PIAPI_API_KEY', required: false, description: 'PiAPI for fast image generation' },
  { name: 'GROQ_API_KEY', required: false, description: 'Groq for fast inference' },
  { name: 'RESEND_API_KEY', required: false, description: 'Email sending' },
  { name: 'RUNPOD_API_KEY', required: false, description: 'RunPod video generation' },
  { name: 'RUNPOD_ENDPOINT_ID', required: false, description: 'RunPod endpoint' },
  { name: 'ATMOS_CONSUMER_ID', required: false, description: 'ATMOS payment merchant ID' },
  { name: 'ATMOS_CONSUMER_SECRET', required: false, description: 'ATMOS payment secret' },
  { name: 'DEV_UNLIMITED_EMAILS', required: false, description: 'Comma-separated dev emails for unlimited access' },
];

export default function MigrationExport() {
  const navigate = useNavigate();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    tables: true,
    storage: false,
    functions: false,
  });

  const copyToClipboard = async (text: string, section: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const downloadSQL = () => {
    const fullSQL = `${SQL_SECTIONS.tables}\n\n${SQL_SECTIONS.storage}\n\n${SQL_SECTIONS.functions}`;
    const blob = new Blob([fullSQL], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bahor-ai-migration.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Supabase Migration Export</h1>
            <p className="text-muted-foreground">Copy SQL to your Supabase SQL Editor</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Quick Actions
              <Button onClick={downloadSQL} className="gap-2">
                <Download className="h-4 w-4" />
                Download All SQL
              </Button>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* SQL Sections */}
        {Object.entries(SQL_SECTIONS).map(([key, sql]) => (
          <Card key={key}>
            <CardHeader 
              className="cursor-pointer"
              onClick={() => toggleSection(key)}
            >
              <CardTitle className="flex items-center justify-between">
                <span className="capitalize">{key === 'tables' ? 'Core Tables & Policies' : key === 'storage' ? 'Storage Buckets' : 'Functions & Triggers'}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(sql, key);
                    }}
                    className="gap-2"
                  >
                    {copiedSection === key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedSection === key ? 'Copied!' : 'Copy'}
                  </Button>
                  {expandedSections[key] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardTitle>
              <CardDescription>
                {key === 'tables' && 'profiles, usage_counters, chat_threads, chat_messages, etc.'}
                {key === 'storage' && '8 buckets with RLS policies'}
                {key === 'functions' && 'init_and_check_usage, handle_new_user, triggers'}
              </CardDescription>
            </CardHeader>
            {expandedSections[key] && (
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs max-h-96">
                  <code>{sql}</code>
                </pre>
              </CardContent>
            )}
          </Card>
        ))}

        {/* Secrets List */}
        <Card>
          <CardHeader>
            <CardTitle>Required Edge Function Secrets</CardTitle>
            <CardDescription>Set these in Supabase Dashboard → Settings → Edge Functions → Secrets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {SECRETS_LIST.map((secret) => (
                <div key={secret.name} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <div>
                    <code className="text-sm font-mono">{secret.name}</code>
                    {secret.required && <span className="ml-2 text-xs text-destructive">*required</span>}
                    <p className="text-xs text-muted-foreground">{secret.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(secret.name, secret.name)}
                  >
                    {copiedSection === secret.name ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
