# Supabase Migration Guide - Complete Schema

## Overview

This guide provides the complete database schema for migrating Bahor AI from Lovable Cloud to your own Supabase project.

---

## Step 1: Environment Variables

Update your `.env` file:

```env
VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key-here"
VITE_SUPABASE_PROJECT_ID="YOUR_PROJECT_ID"
VITE_APP_VERSION="1.0.0-beta"
```

---

## Step 2: Edge Function Secrets

Set these in Supabase Dashboard → Settings → Edge Functions → Secrets:

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
| `GROQ_API_KEY` | Groq for fast inference |
| `RESEND_API_KEY` | Email sending |
| `ILOVE_PUBLIC_KEY` | iLoveAPI document conversion |
| `ILOVE_SECRET_KEY` | iLoveAPI secret |
| `RUNPOD_API_KEY` | RunPod video generation |
| `RUNPOD_ENDPOINT_ID` | RunPod endpoint |
| `RUNPOD_LTXV_ENDPOINT_ID` | RunPod LTX Video endpoint |
| `FIXIE_URL` | Static IP proxy for ATMOS |
| `ATMOS_API_BASE` | ATMOS payment API base URL |
| `ATMOS_CONSUMER_ID` | ATMOS merchant ID |
| `ATMOS_CONSUMER_SECRET` | ATMOS merchant secret |
| `ATMOS_STORE_ID` | ATMOS store ID |
| `ATMOS_TEST_MODE` | "true" or "false" |
| `ATMOS_CHECKOUT_BASE_TEST` | Test checkout URL |
| `ATMOS_CHECKOUT_BASE_PROD` | Production checkout URL |
| `DEV_UNLIMITED_EMAILS` | Comma-separated dev emails |
| `ADMIN_EMAILS` | Comma-separated admin emails |

---

## Step 3: Complete Database Schema

Run the following SQL in your Supabase SQL Editor. Execute each section in order.

---

### Part 1: Core User Tables

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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

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
  ON public.profiles_private FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own private profile"
  ON public.profiles_private FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own private profile"
  ON public.profiles_private FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own private profile"
  ON public.profiles_private FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- USER_ENTITLEMENTS TABLE (Premium access control)
-- =============================================
CREATE TABLE public.user_entitlements (
  user_id UUID NOT NULL PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'free',
  expires_at TIMESTAMPTZ,
  flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entitlement"
  ON public.user_entitlements FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- USER_DEVICES TABLE (Device tracking)
-- =============================================
CREATE TABLE public.user_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  device_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage user_devices"
  ON public.user_devices FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Users can view their own devices"
  ON public.user_devices FOR SELECT USING (auth.uid() = user_id);
```

---

### Part 2: Usage Tracking Tables

```sql
-- =============================================
-- USAGE_COUNTERS TABLE (Daily usage per user)
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
  ON public.usage_counters FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_usage_counters_date ON public.usage_counters(date);

-- =============================================
-- DAILY_USAGE TABLE (Legacy counter)
-- =============================================
CREATE TABLE public.daily_usage (
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  messages_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily usage"
  ON public.daily_usage FOR SELECT USING (auth.uid() = user_id);

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
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- USAGE_EVENTS TABLE (Detailed logging)
-- =============================================
CREATE TABLE public.usage_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert usage_events"
  ON public.usage_events FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role can read usage_events"
  ON public.usage_events FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Users can read own usage_events"
  ON public.usage_events FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_usage_events_user ON public.usage_events(user_id, created_at DESC);
CREATE INDEX idx_usage_events_type ON public.usage_events(event_type, created_at DESC);
```

---

### Part 3: Chat Tables

```sql
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
  ON public.chat_threads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own threads"
  ON public.chat_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own threads"
  ON public.chat_threads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own threads"
  ON public.chat_threads FOR DELETE USING (auth.uid() = user_id);

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
  ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own messages"
  ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own messages"
  ON public.chat_messages FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own messages"
  ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_chat_messages_thread ON public.chat_messages(thread_id, created_at ASC);

-- =============================================
-- CHAT_ATTACHMENTS TABLE
-- =============================================
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

CREATE POLICY "Users can view their own attachments"
  ON public.chat_attachments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own attachments"
  ON public.chat_attachments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own attachments"
  ON public.chat_attachments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own attachments"
  ON public.chat_attachments FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_chat_attachments_thread ON public.chat_attachments(thread_id);

-- =============================================
-- ATTACHMENT_TEXT TABLE (Extracted text from files)
-- =============================================
CREATE TABLE public.attachment_text (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attachment_id UUID NOT NULL UNIQUE REFERENCES public.chat_attachments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  text TEXT,
  summary TEXT,
  char_count INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attachment_text ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own attachment_text"
  ON public.attachment_text FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own attachment_text"
  ON public.attachment_text FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own attachment_text"
  ON public.attachment_text FOR UPDATE USING (auth.uid() = user_id);
```

---

### Part 4: Agent Tables

```sql
-- =============================================
-- AGENT_THREADS TABLE
-- =============================================
CREATE TABLE public.agent_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Research',
  rolling_summary TEXT,
  pinned_context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own threads"
  ON public.agent_threads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own threads"
  ON public.agent_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own threads"
  ON public.agent_threads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own threads"
  ON public.agent_threads FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_agent_threads_user ON public.agent_threads(user_id, updated_at DESC);

-- =============================================
-- AGENT_MESSAGES TABLE
-- =============================================
CREATE TABLE public.agent_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.agent_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON public.agent_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own messages"
  ON public.agent_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own messages"
  ON public.agent_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own messages"
  ON public.agent_messages FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- AGENT_RUNS TABLE
-- =============================================
CREATE TABLE public.agent_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  thread_id UUID REFERENCES public.agent_threads(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  plan JSONB DEFAULT '[]'::jsonb,
  sources JSONB DEFAULT '[]'::jsonb,
  constraints_json JSONB DEFAULT '{}'::jsonb,
  final_output TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own runs"
  ON public.agent_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own runs"
  ON public.agent_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own runs"
  ON public.agent_runs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own runs"
  ON public.agent_runs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_agent_runs_user ON public.agent_runs(user_id, created_at DESC);
CREATE INDEX idx_agent_runs_thread ON public.agent_runs(thread_id);

-- =============================================
-- AGENT_STEPS TABLE
-- =============================================
CREATE TABLE public.agent_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  rationale TEXT,
  tool_name TEXT,
  tool_input JSONB,
  tool_output JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view steps of their runs"
  ON public.agent_steps FOR SELECT
  USING (EXISTS (SELECT 1 FROM agent_runs WHERE agent_runs.id = agent_steps.run_id AND agent_runs.user_id = auth.uid()));
CREATE POLICY "Users can create steps for their runs"
  ON public.agent_steps FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM agent_runs WHERE agent_runs.id = agent_steps.run_id AND agent_runs.user_id = auth.uid()));
CREATE POLICY "Users can update steps of their runs"
  ON public.agent_steps FOR UPDATE
  USING (EXISTS (SELECT 1 FROM agent_runs WHERE agent_runs.id = agent_steps.run_id AND agent_runs.user_id = auth.uid()));

CREATE INDEX idx_agent_steps_run ON public.agent_steps(run_id, step_index);

-- =============================================
-- AGENT_FILES TABLE
-- =============================================
CREATE TABLE public.agent_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  extracted_text TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agent files"
  ON public.agent_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own agent files"
  ON public.agent_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own agent files"
  ON public.agent_files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own agent files"
  ON public.agent_files FOR DELETE USING (auth.uid() = user_id);
```

---

### Part 5: Circles (Spaces) Tables

```sql
-- =============================================
-- SPACES TABLE (Circles)
-- =============================================
CREATE TABLE public.spaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  template TEXT DEFAULT 'general',
  goal TEXT,
  icon_emoji TEXT DEFAULT '💬',
  icon_color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;

-- Helper functions for space membership
CREATE OR REPLACE FUNCTION public.is_space_member(_space_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.space_members
    WHERE space_id = _space_id AND user_id = auth.uid() AND status = 'active'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_space_admin(_space_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.space_members
    WHERE space_id = _space_id AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE POLICY "Users can view their spaces"
  ON public.spaces FOR SELECT USING ((auth.uid() = owner_id) OR is_space_member(id));
CREATE POLICY "Users can create spaces"
  ON public.spaces FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update space"
  ON public.spaces FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owner can delete space"
  ON public.spaces FOR DELETE USING (auth.uid() = owner_id);

-- =============================================
-- SPACE_MEMBERS TABLE
-- =============================================
CREATE TABLE public.space_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(space_id, user_id)
);

ALTER TABLE public.space_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view members of their spaces"
  ON public.space_members FOR SELECT USING (is_space_member(space_id));
CREATE POLICY "Admins can add members"
  ON public.space_members FOR INSERT WITH CHECK (is_space_admin(space_id));
CREATE POLICY "Admins can update members"
  ON public.space_members FOR UPDATE USING (is_space_admin(space_id));
CREATE POLICY "Admins can remove members"
  ON public.space_members FOR DELETE USING (is_space_admin(space_id));

-- Auto-add owner as member
CREATE OR REPLACE FUNCTION public.handle_new_space()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.space_members (space_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_space_created
  AFTER INSERT ON public.spaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_space();

-- =============================================
-- SPACE_INVITES TABLE
-- =============================================
CREATE TABLE public.space_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.space_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view space invites"
  ON public.space_invites FOR SELECT USING (is_space_admin(space_id));
CREATE POLICY "Admins can create invites"
  ON public.space_invites FOR INSERT WITH CHECK (is_space_admin(space_id) AND auth.uid() = created_by);
CREATE POLICY "Admins can revoke invites"
  ON public.space_invites FOR UPDATE USING (is_space_admin(space_id));

-- =============================================
-- SPACE_JOIN_REQUESTS TABLE
-- =============================================
CREATE TABLE public.space_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  invite_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT,
  requester_name TEXT,
  requester_avatar_url TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.space_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can create join requests"
  ON public.space_join_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can view their own requests"
  ON public.space_join_requests FOR SELECT USING (auth.uid() = requester_id);
CREATE POLICY "Admins can view requests for their spaces"
  ON public.space_join_requests FOR SELECT USING (is_space_admin(space_id));
CREATE POLICY "Admins can review requests"
  ON public.space_join_requests FOR UPDATE USING (is_space_admin(space_id));

-- =============================================
-- SPACE_MESSAGES TABLE
-- =============================================
CREATE TABLE public.space_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  file_id UUID,
  reply_to_id UUID REFERENCES public.space_messages(id),
  attachments JSONB,
  client_id TEXT,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.space_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view messages"
  ON public.space_messages FOR SELECT USING (is_space_member(space_id));
CREATE POLICY "Members can send messages"
  ON public.space_messages FOR INSERT WITH CHECK (is_space_member(space_id) AND auth.uid() = sender_id);
CREATE POLICY "Sender or admin can update messages"
  ON public.space_messages FOR UPDATE USING ((auth.uid() = sender_id) OR is_space_admin(space_id));
CREATE POLICY "Sender or admin can delete messages"
  ON public.space_messages FOR DELETE USING ((auth.uid() = sender_id) OR is_space_admin(space_id));

CREATE INDEX idx_space_messages_space ON public.space_messages(space_id, created_at DESC);

-- =============================================
-- SPACE_MESSAGE_READS TABLE
-- =============================================
CREATE TABLE public.space_message_reads (
  message_id UUID NOT NULL REFERENCES public.space_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

ALTER TABLE public.space_message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view read receipts"
  ON public.space_message_reads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM space_messages sm JOIN space_members m ON m.space_id = sm.space_id
    WHERE sm.id = space_message_reads.message_id AND m.user_id = auth.uid() AND m.status = 'active'
  ));
CREATE POLICY "Members can insert their own read receipts"
  ON public.space_message_reads FOR INSERT
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM space_messages sm JOIN space_members m ON m.space_id = sm.space_id
    WHERE sm.id = space_message_reads.message_id AND m.user_id = auth.uid() AND m.status = 'active'
  ));

-- =============================================
-- SPACE_MESSAGE_ATTACHMENTS TABLE
-- =============================================
CREATE TABLE public.space_message_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.space_messages(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL,
  bucket TEXT NOT NULL DEFAULT 'space-chat-files',
  path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.space_message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "space_attachments_select"
  ON public.space_message_attachments FOR SELECT
  USING (EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = space_message_attachments.space_id AND sm.user_id = auth.uid() AND sm.status = 'active'));
CREATE POLICY "space_attachments_insert"
  ON public.space_message_attachments FOR INSERT
  WITH CHECK (uploader_id = auth.uid() AND EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = space_message_attachments.space_id AND sm.user_id = auth.uid() AND sm.status = 'active'));
CREATE POLICY "space_attachments_delete"
  ON public.space_message_attachments FOR DELETE
  USING (uploader_id = auth.uid() OR EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = space_message_attachments.space_id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'admin') AND sm.status = 'active'));

-- =============================================
-- SPACE_FILES TABLE
-- =============================================
CREATE TABLE public.space_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.space_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view space files"
  ON public.space_files FOR SELECT USING (is_space_member(space_id));
CREATE POLICY "Members can upload files"
  ON public.space_files FOR INSERT WITH CHECK (is_space_member(space_id) AND auth.uid() = uploader_id);
CREATE POLICY "Admins can update files"
  ON public.space_files FOR UPDATE USING (is_space_admin(space_id));
CREATE POLICY "Uploader or admin can delete files"
  ON public.space_files FOR DELETE USING ((auth.uid() = uploader_id) OR is_space_admin(space_id));

-- =============================================
-- CIRCLE_AI_CARDS TABLE
-- =============================================
CREATE TABLE public.circle_ai_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  auto_title TEXT NOT NULL DEFAULT '',
  content_md TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  pinned BOOLEAN NOT NULL DEFAULT false,
  source_message_count INTEGER NOT NULL DEFAULT 0,
  source_last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.circle_ai_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Circle members can view cards"
  ON public.circle_ai_cards FOR SELECT USING (is_space_member(circle_id));
CREATE POLICY "Circle members can create cards"
  ON public.circle_ai_cards FOR INSERT WITH CHECK (is_space_member(circle_id) AND auth.uid() = creator_id);
CREATE POLICY "Creator or admin can update cards"
  ON public.circle_ai_cards FOR UPDATE USING ((auth.uid() = creator_id) OR is_space_admin(circle_id));
CREATE POLICY "Creator or admin can delete cards"
  ON public.circle_ai_cards FOR DELETE USING ((auth.uid() = creator_id) OR is_space_admin(circle_id));
```

---

### Part 6: Media Generation Tables

```sql
-- =============================================
-- IMAGE_GENERATIONS TABLE
-- =============================================
CREATE TABLE public.image_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt_uz TEXT NOT NULL,
  prompt_en TEXT NOT NULL,
  negative_prompt_en TEXT,
  aspect_ratio TEXT DEFAULT '1:1',
  guidance_scale NUMERIC DEFAULT 3.5,
  num_inference_steps INTEGER DEFAULT 4,
  seed BIGINT,
  status TEXT NOT NULL DEFAULT 'done',
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/png',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.image_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generations"
  ON public.image_generations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own generations"
  ON public.image_generations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own generations"
  ON public.image_generations FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_image_generations_user ON public.image_generations(user_id, created_at DESC);

-- =============================================
-- VIDEO_GENERATIONS TABLE
-- =============================================
CREATE TABLE public.video_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  mode TEXT DEFAULT 'fast',
  prompt TEXT,
  prompt_uz TEXT,
  prompt_en TEXT,
  negative_prompt TEXT,
  source_type TEXT,
  source_path TEXT,
  aspect_ratio TEXT,
  width INTEGER,
  height INTEGER,
  fps INTEGER,
  duration_seconds INTEGER,
  seed INTEGER,
  params JSONB,
  runpod_job_id TEXT,
  runpod_status JSONB,
  progress INTEGER,
  output_video_path TEXT,
  output_video_url TEXT,
  error TEXT,
  cost_estimate JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own video generations"
  ON public.video_generations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own video generations"
  ON public.video_generations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own video generations"
  ON public.video_generations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own video generations"
  ON public.video_generations FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_video_generations_user ON public.video_generations(user_id, created_at DESC);

-- =============================================
-- VIDEO_GENERATION_ASSETS TABLE
-- =============================================
CREATE TABLE public.video_generation_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  generation_id UUID REFERENCES public.video_generations(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.video_generation_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own assets"
  ON public.video_generation_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own assets"
  ON public.video_generation_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own assets"
  ON public.video_generation_assets FOR DELETE USING (auth.uid() = user_id);
```

---

### Part 7: Document & File Tables

```sql
-- =============================================
-- USER_FILES TABLE
-- =============================================
CREATE TABLE public.user_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tool TEXT NOT NULL,
  title TEXT NOT NULL,
  bucket TEXT NOT NULL DEFAULT 'user-files',
  path TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  size_bytes BIGINT,
  source TEXT NOT NULL DEFAULT 'iloveapi',
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own files"
  ON public.user_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own files"
  ON public.user_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own files"
  ON public.user_files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own files"
  ON public.user_files FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_user_files_user ON public.user_files(user_id, created_at DESC);

-- =============================================
-- DOC_JOBS TABLE (Document conversion jobs)
-- =============================================
CREATE TABLE public.doc_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tool TEXT NOT NULL,
  input JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  ilove_task TEXT,
  ilove_server TEXT,
  result_file_id UUID REFERENCES public.user_files(id),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.doc_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own jobs"
  ON public.doc_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own jobs"
  ON public.doc_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own jobs"
  ON public.doc_jobs FOR UPDATE USING (auth.uid() = user_id);
```

---

### Part 8: Payment Tables

```sql
-- =============================================
-- ATMOS_CARDS TABLE
-- =============================================
CREATE TABLE public.atmos_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  masked_pan TEXT,
  expiry TEXT,
  phone TEXT,
  card_token TEXT,
  binding_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.atmos_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to cards"
  ON public.atmos_cards FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- ATMOS_TRANSACTIONS TABLE
-- =============================================
CREATE TABLE public.atmos_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan TEXT NOT NULL,
  amount_tiyin INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UZS',
  account TEXT NOT NULL,
  store_id TEXT,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  provider_payload JSONB DEFAULT '{}'::jsonb,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.atmos_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to transactions"
  ON public.atmos_transactions FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Users can view their own transactions"
  ON public.atmos_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_atmos_transactions_user ON public.atmos_transactions(user_id, created_at DESC);

-- =============================================
-- SUBSCRIPTIONS TABLE
-- =============================================
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  atmos_card_id UUID REFERENCES public.atmos_cards(id),
  last_transaction_id UUID REFERENCES public.atmos_transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- PAYMENT_EVENTS TABLE (Observability)
-- =============================================
CREATE TABLE public.payment_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event TEXT NOT NULL,
  transaction_id TEXT,
  status TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert payment_events"
  ON public.payment_events FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role can read all payment_events"
  ON public.payment_events FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Users can view their own payment_events"
  ON public.payment_events FOR SELECT USING (auth.uid() = user_id);
```

---

### Part 9: Search & Cache Tables

```sql
-- =============================================
-- SEARCH_CACHE TABLE
-- =============================================
CREATE TABLE public.search_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_norm TEXT NOT NULL,
  cx TEXT NOT NULL,
  locale TEXT,
  result_json JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;

-- Only service role manages cache
CREATE POLICY "Service role manages search_cache"
  ON public.search_cache FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_search_cache_query ON public.search_cache(query_norm, cx);
CREATE INDEX idx_search_cache_expires ON public.search_cache(expires_at);

-- =============================================
-- SEARCH_USAGE TABLE
-- =============================================
CREATE TABLE public.search_usage (
  user_id UUID NOT NULL,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

ALTER TABLE public.search_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage search_usage"
  ON public.search_usage FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Users can view own search usage"
  ON public.search_usage FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- SEARCH_GLOBAL_BURST TABLE (Rate limiting)
-- =============================================
CREATE TABLE public.search_global_burst (
  minute_bucket TIMESTAMPTZ NOT NULL PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.search_global_burst ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage search_global_burst"
  ON public.search_global_burst FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- PIAPI_QUEUE TABLE (Image gen concurrency)
-- =============================================
CREATE TABLE public.piapi_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id TEXT,
  provider TEXT NOT NULL DEFAULT 'piapi',
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.piapi_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to piapi_queue"
  ON public.piapi_queue FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
```

---

### Part 10: Feedback & Misc Tables

```sql
-- =============================================
-- BETA_FEEDBACK TABLE
-- =============================================
CREATE TABLE public.beta_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  screenshot_url TEXT,
  route TEXT,
  user_agent TEXT,
  app_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit feedback"
  ON public.beta_feedback FOR INSERT WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));
CREATE POLICY "Users can view own feedback"
  ON public.beta_feedback FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- PREMIUM_WAITLIST TABLE
-- =============================================
CREATE TABLE public.premium_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact TEXT NOT NULL,
  plan TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.premium_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit to waitlist"
  ON public.premium_waitlist FOR INSERT
  WITH CHECK (length(trim(contact)) > 0 AND length(trim(plan)) > 0);
CREATE POLICY "Service role can read waitlist"
  ON public.premium_waitlist FOR SELECT USING (false);

-- =============================================
-- TOOL_DECISIONS TABLE (Analytics)
-- =============================================
CREATE TABLE public.tool_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_preview TEXT NOT NULL,
  selected_tool TEXT NOT NULL DEFAULT 'text',
  image_intent BOOLEAN DEFAULT false,
  search_intent BOOLEAN DEFAULT false,
  confidence NUMERIC DEFAULT 1.00,
  explicit_command BOOLEAN DEFAULT false,
  detected_language TEXT,
  ui_language TEXT,
  blockers_hit TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tool_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert tool_decisions"
  ON public.tool_decisions FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Users can read own tool_decisions"
  ON public.tool_decisions FOR SELECT USING (auth.uid() = user_id);
```

---

### Part 11: Views

```sql
-- =============================================
-- MY_PROFILE VIEW (Current user's full profile)
-- =============================================
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

-- =============================================
-- PROFILE_DISPLAY VIEW (Public display info)
-- =============================================
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

### Part 12: Database Functions

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

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_video_generations_updated_at
  BEFORE UPDATE ON public.video_generations
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- SYNC PLAN LIMITS
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
-- UPDATE AGENT THREAD TIMESTAMP
-- =============================================
CREATE OR REPLACE FUNCTION public.update_agent_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.agent_threads
  SET updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_agent_message_insert
  AFTER INSERT ON public.agent_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_agent_thread_timestamp();

-- =============================================
-- CLEANUP SEARCH CACHE
-- =============================================
CREATE OR REPLACE FUNCTION public.cleanup_search_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM search_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  DELETE FROM search_global_burst WHERE minute_bucket < now() - interval '1 hour';
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- CLEANUP PIAPI QUEUE
-- =============================================
CREATE OR REPLACE FUNCTION public.cleanup_piapi_queue()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM piapi_queue 
  WHERE (status IN ('completed', 'failed') AND completed_at < now() - interval '1 hour')
     OR (status = 'pending' AND created_at < now() - interval '5 minutes')
     OR (status = 'processing' AND started_at < now() - interval '2 minutes');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- ACQUIRE PIAPI SLOT
-- =============================================
CREATE OR REPLACE FUNCTION public.acquire_piapi_slot(p_user_id UUID, p_max_concurrent INTEGER DEFAULT 4)
RETURNS JSONB AS $$
DECLARE
  v_active_count INTEGER;
  v_slot_id UUID;
BEGIN
  PERFORM cleanup_piapi_queue();
  
  SELECT COUNT(*) INTO v_active_count
  FROM piapi_queue WHERE status IN ('pending', 'processing');
  
  IF v_active_count >= p_max_concurrent THEN
    RETURN jsonb_build_object(
      'acquired', false,
      'active_count', v_active_count,
      'max_concurrent', p_max_concurrent,
      'wait_recommended', true
    );
  END IF;
  
  INSERT INTO piapi_queue (user_id, status, started_at)
  VALUES (p_user_id, 'processing', now())
  RETURNING id INTO v_slot_id;
  
  RETURN jsonb_build_object(
    'acquired', true,
    'slot_id', v_slot_id,
    'active_count', v_active_count + 1,
    'max_concurrent', p_max_concurrent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- RELEASE PIAPI SLOT
-- =============================================
CREATE OR REPLACE FUNCTION public.release_piapi_slot(p_slot_id UUID, p_status TEXT DEFAULT 'completed')
RETURNS VOID AS $$
BEGIN
  UPDATE piapi_queue
  SET status = p_status, completed_at = now()
  WHERE id = p_slot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- GET SPACE BY INVITE CODE
-- =============================================
CREATE OR REPLACE FUNCTION public.get_space_by_invite_code(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_invite space_invites%ROWTYPE;
  v_space spaces%ROWTYPE;
  v_owner_name TEXT;
BEGIN
  SELECT * INTO v_invite FROM space_invites WHERE code = UPPER(p_code) AND revoked = false;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invite_not_found');
  END IF;
  
  SELECT * INTO v_space FROM spaces WHERE id = v_invite.space_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'space_not_found');
  END IF;
  
  SELECT COALESCE(
    NULLIF(TRIM(CONCAT(first_name, ' ', last_name)), ''),
    'Owner'
  ) INTO v_owner_name FROM profiles WHERE user_id = v_space.owner_id;
  
  RETURN jsonb_build_object(
    'id', v_space.id,
    'name', v_space.name,
    'template', v_space.template,
    'owner_name', v_owner_name,
    'invite_valid', true
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
  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'profile_not_found');
  END IF;
  
  IF NOT p_is_bypass AND v_profile.trial_started_at IS NULL THEN
    UPDATE profiles
    SET trial_started_at = v_now,
        trial_expires_at = v_now + (p_trial_days || ' days')::interval,
        plan = 'beta_premium',
        updated_at = v_now
    WHERE user_id = p_user_id
    RETURNING * INTO v_profile;
  END IF;
  
  IF v_profile.plan = 'beta_premium' AND v_profile.trial_expires_at IS NOT NULL AND v_profile.trial_expires_at <= v_now THEN
    UPDATE profiles SET plan = 'free', updated_at = v_now WHERE user_id = p_user_id;
    v_profile.plan := 'free';
  END IF;

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

  v_is_beta_active := v_profile.plan = 'beta_premium' AND v_profile.trial_expires_at IS NOT NULL AND v_profile.trial_expires_at > v_now;
  
  IF v_profile.plan = 'dev_unlimited' THEN
    v_daily_limit := -1; v_search_limit := -1; v_vision_limit := -1; v_file_limit := -1;
  ELSIF v_is_beta_active THEN
    v_daily_limit := 10; v_search_limit := 3; v_vision_limit := 3; v_file_limit := 2;
  ELSE
    v_daily_limit := 5; v_search_limit := 0; v_vision_limit := 0; v_file_limit := 0;
  END IF;
  
  INSERT INTO usage_counters (user_id, date, messages_used, searches_used, vision_used, files_used)
  VALUES (p_user_id, v_today, 0, 0, 0, 0)
  ON CONFLICT (user_id, date) DO NOTHING;
  
  SELECT * INTO v_usage FROM usage_counters WHERE user_id = p_user_id AND date = v_today FOR UPDATE;
  
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
  
  IF p_wants_search AND v_search_limit != -1 AND v_usage.searches_used >= v_search_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'search_limit_reached', 'plan', v_profile.plan);
  END IF;
  
  IF p_wants_vision AND v_vision_limit != -1 AND v_usage.vision_used >= v_vision_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'vision_limit_reached', 'plan', v_profile.plan);
  END IF;
  
  IF p_wants_file AND v_file_limit != -1 AND v_usage.files_used >= v_file_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'file_limit_reached', 'plan', v_profile.plan);
  END IF;
  
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
-- GET EFFECTIVE ENTITLEMENT
-- =============================================
CREATE OR REPLACE FUNCTION public.get_effective_entitlement(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_entitlement user_entitlements%ROWTYPE;
  v_plan TEXT;
  v_is_premium BOOLEAN;
BEGIN
  SELECT * INTO v_entitlement FROM user_entitlements WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('plan', 'free', 'isPremium', false, 'expiresAt', null, 'flags', '{}'::jsonb);
  END IF;
  
  IF v_entitlement.plan = 'premium' THEN
    IF v_entitlement.expires_at IS NULL OR v_entitlement.expires_at > now() THEN
      v_is_premium := true;
      v_plan := 'premium';
    ELSE
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- GET USAGE SUMMARY (Admin analytics)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_usage_summary(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'date', p_date,
    'chat', jsonb_build_object(
      'total_calls', COUNT(*) FILTER (WHERE event_type = 'chat'),
      'avg_duration_ms', ROUND(AVG((meta->>'duration_ms')::numeric) FILTER (WHERE event_type = 'chat')),
      'total_tokens_in', SUM((meta->>'tokens_in')::int) FILTER (WHERE event_type = 'chat'),
      'total_tokens_out', SUM((meta->>'tokens_out')::int) FILTER (WHERE event_type = 'chat')
    ),
    'search', jsonb_build_object(
      'total_calls', COUNT(*) FILTER (WHERE event_type = 'search'),
      'cache_hits', COUNT(*) FILTER (WHERE event_type = 'search' AND (meta->>'cache_hit')::boolean = true),
      'cache_misses', COUNT(*) FILTER (WHERE event_type = 'search' AND (meta->>'cache_hit')::boolean = false)
    ),
    'image_gen', jsonb_build_object(
      'total_calls', COUNT(*) FILTER (WHERE event_type = 'image_gen'),
      'success', COUNT(*) FILTER (WHERE event_type = 'image_gen' AND (meta->>'success')::boolean = true),
      'failed', COUNT(*) FILTER (WHERE event_type = 'image_gen' AND (meta->>'success')::boolean = false)
    )
  ) INTO v_result
  FROM usage_events
  WHERE created_at >= p_date::timestamptz AND created_at < (p_date + 1)::timestamptz;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

## Step 4: Storage Buckets

Create these in Supabase Dashboard → Storage:

| Bucket | Public | Purpose |
|--------|--------|---------|
| `avatars` | Yes | User profile photos |
| `chat-attachments` | Yes | Chat file uploads |
| `user-files` | No | Document conversions |
| `feedback-screenshots` | No | Bug report screenshots |
| `space-files` | No | Circle shared files |
| `space-chat-files` | No | Circle message attachments |
| `video-generations` | No | Generated videos |
| `video-assets` | No | Video source files |

---

## Step 5: Enable Auth

In Supabase Dashboard → Authentication → Settings:
- Enable Email auth
- Disable "Confirm email" for faster testing
- Add redirect URLs

---

## Step 6: Deploy Edge Functions

```bash
cd supabase/functions
supabase functions deploy --project-ref YOUR_PROJECT_ID
```

---

## Verification Checklist

- [ ] Environment variables set in `.env`
- [ ] All secrets configured in Edge Functions
- [ ] Part 1-12 SQL executed without errors
- [ ] Storage buckets created
- [ ] Edge functions deployed
- [ ] Auth configured
- [ ] Test signup creates profile automatically
