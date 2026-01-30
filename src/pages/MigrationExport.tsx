import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Check, Download, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// SQL Schema sections for easy copy
const SQL_SECTIONS = {
  core: `-- =============================================
-- BAHOR AI - COMPLETE DATABASE SCHEMA
-- Part 1: Core User Tables
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
CREATE POLICY "Users can update own private profile" ON public.profiles_private FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own private profile" ON public.profiles_private FOR DELETE USING (auth.uid() = user_id);

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
CREATE POLICY "Users can view their own entitlement" ON public.user_entitlements FOR SELECT USING (auth.uid() = user_id);

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
CREATE POLICY "Users can view their own devices" ON public.user_devices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage user_devices" ON public.user_devices FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');`,

  usage: `-- =============================================
-- Part 2: Usage Tracking Tables
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
CREATE POLICY "Users can view their own usage" ON public.usage_counters FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE public.global_usage_counters (
  date DATE NOT NULL PRIMARY KEY,
  searches_used INTEGER NOT NULL DEFAULT 0,
  vision_used INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.global_usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only access" ON public.global_usage_counters FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE public.daily_usage (
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  messages_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own daily usage" ON public.daily_usage FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE public.usage_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can insert usage_events" ON public.usage_events FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role can read usage_events" ON public.usage_events FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Users can read own usage_events" ON public.usage_events FOR SELECT USING (auth.uid() = user_id);

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
  blockers_hit TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tool_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can insert tool_decisions" ON public.tool_decisions FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Users can read own tool_decisions" ON public.tool_decisions FOR SELECT USING (auth.uid() = user_id);`,

  chat: `-- =============================================
-- Part 3: Chat Tables
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

CREATE INDEX idx_chat_threads_user_updated ON public.chat_threads(user_id, updated_at DESC);

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

CREATE INDEX idx_chat_messages_thread ON public.chat_messages(thread_id, created_at ASC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own messages" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own messages" ON public.chat_messages FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
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
CREATE POLICY "Users can update their own attachments" ON public.chat_attachments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own attachments" ON public.chat_attachments FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.attachment_text (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attachment_id UUID NOT NULL UNIQUE REFERENCES public.chat_attachments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  text TEXT,
  summary TEXT,
  char_count INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attachment_text ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own attachment_text" ON public.attachment_text FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own attachment_text" ON public.attachment_text FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attachment_text" ON public.attachment_text FOR UPDATE USING (auth.uid() = user_id);`,

  agent: `-- =============================================
-- Part 4: Agent/Research Tables
-- =============================================

CREATE TABLE public.agent_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  rolling_summary TEXT,
  pinned_context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own threads" ON public.agent_threads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own threads" ON public.agent_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own threads" ON public.agent_threads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own threads" ON public.agent_threads FOR DELETE USING (auth.uid() = user_id);

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
CREATE POLICY "Users can view their own messages" ON public.agent_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own messages" ON public.agent_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own messages" ON public.agent_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own messages" ON public.agent_messages FOR DELETE USING (auth.uid() = user_id);

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
CREATE POLICY "Users can view their own runs" ON public.agent_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own runs" ON public.agent_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own runs" ON public.agent_runs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own runs" ON public.agent_runs FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.agent_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  rationale TEXT,
  tool_name TEXT,
  tool_input JSONB,
  tool_output JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view steps of their runs" ON public.agent_steps FOR SELECT USING (EXISTS (SELECT 1 FROM agent_runs WHERE agent_runs.id = agent_steps.run_id AND agent_runs.user_id = auth.uid()));
CREATE POLICY "Users can create steps for their runs" ON public.agent_steps FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM agent_runs WHERE agent_runs.id = agent_steps.run_id AND agent_runs.user_id = auth.uid()));
CREATE POLICY "Users can update steps of their runs" ON public.agent_steps FOR UPDATE USING (EXISTS (SELECT 1 FROM agent_runs WHERE agent_runs.id = agent_steps.run_id AND agent_runs.user_id = auth.uid()));

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
CREATE POLICY "Users can view their own agent files" ON public.agent_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own agent files" ON public.agent_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own agent files" ON public.agent_files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own agent files" ON public.agent_files FOR DELETE USING (auth.uid() = user_id);`,

  spaces: `-- =============================================
-- Part 5: Circles/Spaces Tables
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

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_space_member(_space_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.space_members
    WHERE space_id = _space_id AND user_id = auth.uid() AND status = 'active'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_space_admin(_space_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.space_members
    WHERE space_id = _space_id AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE POLICY "Users can create spaces" ON public.spaces FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can view their spaces" ON public.spaces FOR SELECT USING (auth.uid() = owner_id OR is_space_member(id));
CREATE POLICY "Owner can update space" ON public.spaces FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owner can delete space" ON public.spaces FOR DELETE USING (auth.uid() = owner_id);

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
CREATE POLICY "Members can view members of their spaces" ON public.space_members FOR SELECT USING (is_space_member(space_id));
CREATE POLICY "Admins can add members" ON public.space_members FOR INSERT WITH CHECK (is_space_admin(space_id));
CREATE POLICY "Admins can update members" ON public.space_members FOR UPDATE USING (is_space_admin(space_id));
CREATE POLICY "Admins can remove members" ON public.space_members FOR DELETE USING (is_space_admin(space_id));

-- Auto-add owner as member
CREATE OR REPLACE FUNCTION public.handle_new_space() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.space_members (space_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_space_created AFTER INSERT ON public.spaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_space();

CREATE TABLE public.space_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_by UUID NOT NULL,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(code)
);

ALTER TABLE public.space_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view space invites" ON public.space_invites FOR SELECT USING (is_space_admin(space_id));
CREATE POLICY "Admins can create invites" ON public.space_invites FOR INSERT WITH CHECK (is_space_admin(space_id) AND auth.uid() = created_by);
CREATE POLICY "Admins can revoke invites" ON public.space_invites FOR UPDATE USING (is_space_admin(space_id));

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
CREATE POLICY "Authenticated users can create join requests" ON public.space_join_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can view their own requests" ON public.space_join_requests FOR SELECT USING (auth.uid() = requester_id);
CREATE POLICY "Admins can view requests for their spaces" ON public.space_join_requests FOR SELECT USING (is_space_admin(space_id));
CREATE POLICY "Admins can review requests" ON public.space_join_requests FOR UPDATE USING (is_space_admin(space_id));

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
CREATE POLICY "Members can view messages" ON public.space_messages FOR SELECT USING (is_space_member(space_id));
CREATE POLICY "Members can send messages" ON public.space_messages FOR INSERT WITH CHECK (is_space_member(space_id) AND auth.uid() = sender_id);
CREATE POLICY "Sender or admin can update messages" ON public.space_messages FOR UPDATE USING (auth.uid() = sender_id OR is_space_admin(space_id));
CREATE POLICY "Sender or admin can delete messages" ON public.space_messages FOR DELETE USING (auth.uid() = sender_id OR is_space_admin(space_id));

CREATE TABLE public.space_message_reads (
  message_id UUID NOT NULL REFERENCES public.space_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

ALTER TABLE public.space_message_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view read receipts" ON public.space_message_reads FOR SELECT USING (EXISTS (SELECT 1 FROM space_messages sm JOIN space_members m ON m.space_id = sm.space_id WHERE sm.id = space_message_reads.message_id AND m.user_id = auth.uid() AND m.status = 'active'));
CREATE POLICY "Members can insert their own read receipts" ON public.space_message_reads FOR INSERT WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM space_messages sm JOIN space_members m ON m.space_id = sm.space_id WHERE sm.id = space_message_reads.message_id AND m.user_id = auth.uid() AND m.status = 'active'));

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
CREATE POLICY "Members can view space files" ON public.space_files FOR SELECT USING (is_space_member(space_id));
CREATE POLICY "Members can upload files" ON public.space_files FOR INSERT WITH CHECK (is_space_member(space_id) AND auth.uid() = uploader_id);
CREATE POLICY "Admins can update files" ON public.space_files FOR UPDATE USING (is_space_admin(space_id));
CREATE POLICY "Uploader or admin can delete files" ON public.space_files FOR DELETE USING (auth.uid() = uploader_id OR is_space_admin(space_id));

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
CREATE POLICY "space_attachments_select" ON public.space_message_attachments FOR SELECT USING (EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = space_message_attachments.space_id AND sm.user_id = auth.uid() AND sm.status = 'active'));
CREATE POLICY "space_attachments_insert" ON public.space_message_attachments FOR INSERT WITH CHECK (uploader_id = auth.uid() AND EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = space_message_attachments.space_id AND sm.user_id = auth.uid() AND sm.status = 'active'));
CREATE POLICY "space_attachments_delete" ON public.space_message_attachments FOR DELETE USING (uploader_id = auth.uid() OR EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = space_message_attachments.space_id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'admin') AND sm.status = 'active'));

CREATE TABLE public.circle_ai_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  auto_title TEXT NOT NULL DEFAULT '',
  content_md TEXT NOT NULL,
  source_message_count INTEGER NOT NULL DEFAULT 0,
  source_last_message_at TIMESTAMPTZ,
  pinned BOOLEAN NOT NULL DEFAULT false,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.circle_ai_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Circle members can view cards" ON public.circle_ai_cards FOR SELECT USING (is_space_member(circle_id));
CREATE POLICY "Circle members can create cards" ON public.circle_ai_cards FOR INSERT WITH CHECK (is_space_member(circle_id) AND auth.uid() = creator_id);
CREATE POLICY "Creator or admin can update cards" ON public.circle_ai_cards FOR UPDATE USING (auth.uid() = creator_id OR is_space_admin(circle_id));
CREATE POLICY "Creator or admin can delete cards" ON public.circle_ai_cards FOR DELETE USING (auth.uid() = creator_id OR is_space_admin(circle_id));`,

  media: `-- =============================================
-- Part 6: Media Generation Tables
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
CREATE POLICY "Users can view their own generations" ON public.image_generations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own generations" ON public.image_generations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own generations" ON public.image_generations FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.video_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt TEXT,
  prompt_uz TEXT,
  prompt_en TEXT,
  negative_prompt TEXT,
  source_type TEXT,
  source_path TEXT,
  mode TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER,
  aspect_ratio TEXT,
  width INTEGER,
  height INTEGER,
  fps INTEGER,
  duration_seconds INTEGER,
  seed INTEGER,
  params JSONB,
  runpod_job_id TEXT,
  runpod_status JSONB,
  output_video_path TEXT,
  output_video_url TEXT,
  error TEXT,
  cost_estimate JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own video generations" ON public.video_generations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own video generations" ON public.video_generations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own video generations" ON public.video_generations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own video generations" ON public.video_generations FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.video_generation_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generation_id UUID REFERENCES public.video_generations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.video_generation_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own assets" ON public.video_generation_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own assets" ON public.video_generation_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own assets" ON public.video_generation_assets FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.piapi_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'piapi',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.piapi_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to piapi_queue" ON public.piapi_queue FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');`,

  payments: `-- =============================================
-- Part 7: Payment & Subscription Tables
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
CREATE POLICY "Service role full access to cards" ON public.atmos_cards FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

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
CREATE POLICY "Users can view their own transactions" ON public.atmos_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to transactions" ON public.atmos_transactions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
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
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to subscriptions" ON public.subscriptions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

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
CREATE POLICY "Users can view their own payment_events" ON public.payment_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert payment_events" ON public.payment_events FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role can read all payment_events" ON public.payment_events FOR SELECT USING (auth.role() = 'service_role');`,

  misc: `-- =============================================
-- Part 8: Misc Tables
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
CREATE POLICY "Users can view their own files" ON public.user_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own files" ON public.user_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own files" ON public.user_files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own files" ON public.user_files FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.doc_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tool TEXT NOT NULL,
  input JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  result_file_id UUID REFERENCES public.user_files(id),
  ilove_task TEXT,
  ilove_server TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.doc_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own jobs" ON public.doc_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own jobs" ON public.doc_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own jobs" ON public.doc_jobs FOR UPDATE USING (auth.uid() = user_id);

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
CREATE POLICY "Users can submit feedback" ON public.beta_feedback FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can view own feedback" ON public.beta_feedback FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE public.premium_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact TEXT NOT NULL,
  plan TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.premium_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit to waitlist" ON public.premium_waitlist FOR INSERT WITH CHECK (length(TRIM(contact)) > 0 AND length(TRIM(plan)) > 0);
CREATE POLICY "Service role can read waitlist" ON public.premium_waitlist FOR SELECT USING (false);

CREATE TABLE public.search_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_norm TEXT NOT NULL,
  cx TEXT NOT NULL,
  locale TEXT,
  result_json JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.search_usage (
  user_id UUID NOT NULL,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

ALTER TABLE public.search_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own search usage" ON public.search_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage search_usage" ON public.search_usage FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE public.search_global_burst (
  minute_bucket TIMESTAMPTZ NOT NULL PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.search_global_burst ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage search_global_burst" ON public.search_global_burst FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');`,

  storage: `-- =============================================
-- Part 9: Storage Buckets
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
CREATE POLICY "Users can delete their own video generations" ON storage.objects FOR DELETE USING (bucket_id = 'video-generations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own video assets" ON storage.objects FOR SELECT USING (bucket_id = 'video-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload their own video assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'video-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Space members can view space files" ON storage.objects FOR SELECT USING (bucket_id = 'space-files');
CREATE POLICY "Space members can upload space files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'space-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Space members can view space chat files" ON storage.objects FOR SELECT USING (bucket_id = 'space-chat-files');
CREATE POLICY "Space members can upload space chat files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'space-chat-files' AND auth.uid() IS NOT NULL);`,

  functions: `-- =============================================
-- Part 10: Database Functions & Triggers
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

-- Normalize preview helper
CREATE OR REPLACE FUNCTION public.normalize_preview(content TEXT, max_length INTEGER DEFAULT 140)
RETURNS TEXT AS $$
DECLARE
  cleaned TEXT;
BEGIN
  cleaned := regexp_replace(content, '\\*\\*|__|~~|\`{1,3}|#{1,6}\\s*|>\\s*|\\[([^\\]]+)\\]\\([^)]+\\)', '\\1', 'g');
  cleaned := regexp_replace(cleaned, '\\s+', ' ', 'g');
  cleaned := trim(cleaned);
  IF length(cleaned) > max_length THEN
    cleaned := left(cleaned, max_length - 3) || '...';
  END IF;
  RETURN cleaned;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Update thread on message trigger
CREATE OR REPLACE FUNCTION public.update_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_threads
  SET message_count = message_count + 1,
      updated_at = now(),
      last_message_preview = normalize_preview(NEW.content, 140)
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_chat_message_insert
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_thread_on_message();

-- Update agent thread timestamp
CREATE OR REPLACE FUNCTION public.update_agent_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.agent_threads SET updated_at = now() WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_agent_message_insert
  AFTER INSERT ON public.agent_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_agent_thread_timestamp();

-- Cleanup functions
CREATE OR REPLACE FUNCTION public.cleanup_piapi_queue() RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM piapi_queue 
  WHERE (status IN ('completed', 'failed') AND completed_at < now() - interval '1 hour')
     OR (status = 'pending' AND created_at < now() - interval '5 minutes')
     OR (status = 'processing' AND started_at < now() - interval '2 minutes');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.cleanup_search_cache() RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM search_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  DELETE FROM search_global_burst WHERE minute_bucket < now() - interval '1 hour';
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get space by invite code
CREATE OR REPLACE FUNCTION public.get_space_by_invite_code(p_code TEXT) RETURNS JSONB AS $$
DECLARE
  v_invite space_invites%ROWTYPE;
  v_space spaces%ROWTYPE;
  v_owner_name TEXT;
BEGIN
  SELECT * INTO v_invite FROM space_invites WHERE code = UPPER(p_code) AND revoked = false;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'invite_not_found'); END IF;
  
  SELECT * INTO v_space FROM spaces WHERE id = v_invite.space_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'space_not_found'); END IF;
  
  SELECT COALESCE(NULLIF(TRIM(CONCAT(first_name, ' ', last_name)), ''), 'Owner') INTO v_owner_name
  FROM profiles WHERE user_id = v_space.owner_id;
  
  RETURN jsonb_build_object('id', v_space.id, 'name', v_space.name, 'template', v_space.template, 'owner_name', v_owner_name, 'invite_valid', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Quota management functions
CREATE OR REPLACE FUNCTION public.get_trial_status(p_user_id UUID) RETURNS JSONB AS $$
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
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'profile_not_found'); END IF;
  
  IF v_profile.plan = 'beta_premium' AND v_profile.trial_expires_at <= v_now THEN
    UPDATE profiles SET plan = 'free', updated_at = v_now WHERE user_id = p_user_id;
    v_profile.plan := 'free';
  END IF;
  
  v_is_beta_active := v_profile.plan = 'beta_premium' AND v_profile.trial_expires_at > v_now;
  
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
    'used', jsonb_build_object('messages', COALESCE(v_usage.messages_used, 0), 'searches', COALESCE(v_usage.searches_used, 0), 'vision', COALESCE(v_usage.vision_used, 0), 'files', COALESCE(v_usage.files_used, 0)),
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

CREATE OR REPLACE FUNCTION public.get_or_create_trial(p_user_id UUID, p_trial_days INTEGER DEFAULT 14) RETURNS JSONB AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'profile_not_found'); END IF;
  
  IF v_profile.trial_started_at IS NULL THEN
    UPDATE profiles SET trial_started_at = v_now, trial_expires_at = v_now + (p_trial_days || ' days')::interval, plan = 'beta_premium', updated_at = v_now
    WHERE user_id = p_user_id RETURNING * INTO v_profile;
  END IF;
  
  IF v_profile.trial_expires_at <= v_now AND v_profile.plan = 'beta_premium' THEN
    UPDATE profiles SET plan = 'free', updated_at = v_now WHERE user_id = p_user_id RETURNING * INTO v_profile;
  END IF;
  
  RETURN jsonb_build_object('plan', v_profile.plan, 'trial_started_at', v_profile.trial_started_at, 'trial_expires_at', v_profile.trial_expires_at, 'is_beta_active', v_profile.trial_expires_at > v_now AND v_profile.plan = 'beta_premium', 'days_remaining', GREATEST(0, EXTRACT(DAY FROM v_profile.trial_expires_at - v_now)::int));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_effective_entitlement(p_user_id UUID) RETURNS JSONB AS $$
DECLARE
  v_entitlement user_entitlements%ROWTYPE;
  v_plan TEXT;
  v_is_premium BOOLEAN;
BEGIN
  SELECT * INTO v_entitlement FROM user_entitlements WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('plan', 'free', 'isPremium', false, 'expiresAt', null, 'flags', '{}'::jsonb); END IF;
  
  IF v_entitlement.plan = 'premium' THEN
    IF v_entitlement.expires_at IS NULL OR v_entitlement.expires_at > now() THEN
      v_is_premium := true; v_plan := 'premium';
    ELSE
      v_is_premium := false; v_plan := 'free';
    END IF;
  ELSE
    v_is_premium := false; v_plan := 'free';
  END IF;
  
  RETURN jsonb_build_object('plan', v_plan, 'isPremium', v_is_premium, 'expiresAt', v_entitlement.expires_at, 'flags', v_entitlement.flags, 'note', v_entitlement.note);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- PiAPI slot management
CREATE OR REPLACE FUNCTION public.acquire_piapi_slot(p_user_id UUID, p_max_concurrent INTEGER DEFAULT 4) RETURNS JSONB AS $$
DECLARE
  v_active_count INTEGER;
  v_slot_id UUID;
BEGIN
  PERFORM cleanup_piapi_queue();
  SELECT COUNT(*) INTO v_active_count FROM piapi_queue WHERE status IN ('pending', 'processing');
  IF v_active_count >= p_max_concurrent THEN
    RETURN jsonb_build_object('acquired', false, 'active_count', v_active_count, 'max_concurrent', p_max_concurrent, 'wait_recommended', true);
  END IF;
  INSERT INTO piapi_queue (user_id, status, started_at) VALUES (p_user_id, 'processing', now()) RETURNING id INTO v_slot_id;
  RETURN jsonb_build_object('acquired', true, 'slot_id', v_slot_id, 'active_count', v_active_count + 1, 'max_concurrent', p_max_concurrent);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.release_piapi_slot(p_slot_id UUID, p_status TEXT DEFAULT 'completed') RETURNS VOID AS $$
BEGIN
  UPDATE piapi_queue SET status = p_status, completed_at = now() WHERE id = p_slot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Init and check usage (main quota function)
CREATE OR REPLACE FUNCTION public.init_and_check_usage(
  p_user_id UUID,
  p_trial_days INTEGER DEFAULT 7,
  p_is_bypass BOOLEAN DEFAULT false,
  p_wants_search BOOLEAN DEFAULT false,
  p_wants_vision BOOLEAN DEFAULT false,
  p_wants_file BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
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
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed', false, 'reason', 'profile_not_found'); END IF;
  
  IF NOT p_is_bypass AND v_profile.trial_started_at IS NULL THEN
    UPDATE profiles SET trial_started_at = v_now, trial_expires_at = v_now + (p_trial_days || ' days')::interval, plan = 'beta_premium', updated_at = v_now
    WHERE user_id = p_user_id RETURNING * INTO v_profile;
  END IF;
  
  IF v_profile.plan = 'beta_premium' AND v_profile.trial_expires_at <= v_now THEN
    UPDATE profiles SET plan = 'free', updated_at = v_now WHERE user_id = p_user_id;
    v_profile.plan := 'free';
  END IF;

  IF p_is_bypass THEN
    INSERT INTO usage_counters (user_id, date, messages_used, searches_used, vision_used, files_used)
    VALUES (p_user_id, v_today, 1, CASE WHEN p_wants_search THEN 1 ELSE 0 END, CASE WHEN p_wants_vision THEN 1 ELSE 0 END, CASE WHEN p_wants_file THEN 1 ELSE 0 END)
    ON CONFLICT (user_id, date) DO UPDATE SET
      messages_used = usage_counters.messages_used + 1,
      searches_used = usage_counters.searches_used + CASE WHEN p_wants_search THEN 1 ELSE 0 END,
      vision_used = usage_counters.vision_used + CASE WHEN p_wants_vision THEN 1 ELSE 0 END,
      files_used = usage_counters.files_used + CASE WHEN p_wants_file THEN 1 ELSE 0 END;
    RETURN jsonb_build_object('allowed', true, 'is_bypass', true, 'plan', 'dev_unlimited');
  END IF;

  v_is_beta_active := v_profile.plan = 'beta_premium' AND v_profile.trial_expires_at > v_now;
  
  IF v_profile.plan = 'dev_unlimited' THEN
    v_daily_limit := -1; v_search_limit := -1; v_vision_limit := -1; v_file_limit := -1;
  ELSIF v_is_beta_active THEN
    v_daily_limit := 10; v_search_limit := 3; v_vision_limit := 3; v_file_limit := 2;
  ELSE
    v_daily_limit := 5; v_search_limit := 0; v_vision_limit := 0; v_file_limit := 0;
  END IF;
  
  INSERT INTO usage_counters (user_id, date, messages_used, searches_used, vision_used, files_used)
  VALUES (p_user_id, v_today, 0, 0, 0, 0) ON CONFLICT (user_id, date) DO NOTHING;
  
  SELECT * INTO v_usage FROM usage_counters WHERE user_id = p_user_id AND date = v_today FOR UPDATE;
  
  IF v_daily_limit != -1 AND v_usage.messages_used >= v_daily_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'daily_limit_reached', 'plan', v_profile.plan);
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
  
  UPDATE usage_counters SET
    messages_used = messages_used + 1,
    searches_used = searches_used + CASE WHEN p_wants_search THEN 1 ELSE 0 END,
    vision_used = vision_used + CASE WHEN p_wants_vision THEN 1 ELSE 0 END,
    files_used = files_used + CASE WHEN p_wants_file THEN 1 ELSE 0 END
  WHERE user_id = p_user_id AND date = v_today RETURNING * INTO v_usage;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'plan', v_profile.plan,
    'is_beta_active', v_is_beta_active,
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

-- Views
CREATE OR REPLACE VIEW public.my_profile AS
SELECT 
  p.id, p.user_id, p.first_name, p.last_name, p.full_name, p.avatar_url, 
  p.plan, p.daily_limit, p.messages_today, p.last_reset_date,
  p.trial_started_at, p.trial_expires_at, p.language, p.theme,
  p.created_at, p.updated_at, pp.phone
FROM profiles p
LEFT JOIN profiles_private pp ON p.user_id = pp.user_id
WHERE p.user_id = auth.uid();

CREATE OR REPLACE VIEW public.profile_display AS
SELECT user_id, first_name, last_name, full_name, avatar_url
FROM profiles;`
};

const SECRETS_LIST = [
  { name: 'SUPABASE_URL', required: true, description: 'Your Supabase project URL' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: true, description: 'Service role key for admin operations' },
  { name: 'SUPABASE_ANON_KEY', required: true, description: 'Anon key for public operations' },
  { name: 'DEEPSEEK_API_KEY', required: true, description: 'DeepSeek AI API key for chat' },
  { name: 'GOOGLE_SEARCH_API_KEY', required: false, description: 'Google Custom Search API' },
  { name: 'GOOGLE_CX', required: false, description: 'Google Custom Search Engine ID' },
  { name: 'GOOGLE_SEARCH_ENDPOINT', required: false, description: 'Google Search endpoint URL' },
  { name: 'FIREWORKS_API_KEY', required: false, description: 'Fireworks AI for image generation' },
  { name: 'PIAPI_API_KEY', required: false, description: 'PiAPI for fast image generation' },
  { name: 'GROQ_API_KEY', required: false, description: 'Groq for fast inference' },
  { name: 'RESEND_API_KEY', required: false, description: 'Email sending via Resend' },
  { name: 'REPLICATE_API_TOKEN', required: false, description: 'Replicate AI models' },
  { name: 'RUNPOD_API_KEY', required: false, description: 'RunPod video generation' },
  { name: 'RUNPOD_ENDPOINT_ID', required: false, description: 'RunPod WAN endpoint' },
  { name: 'RUNPOD_LTXV_ENDPOINT_ID', required: false, description: 'RunPod LTXV endpoint' },
  { name: 'ILOVE_PUBLIC_KEY', required: false, description: 'iLoveAPI public key' },
  { name: 'ILOVE_SECRET_KEY', required: false, description: 'iLoveAPI secret key' },
  { name: 'ATMOS_CONSUMER_ID', required: false, description: 'ATMOS payment merchant ID' },
  { name: 'ATMOS_CONSUMER_SECRET', required: false, description: 'ATMOS payment secret' },
  { name: 'ATMOS_STORE_ID', required: false, description: 'ATMOS store identifier' },
  { name: 'ATMOS_API_BASE', required: false, description: 'ATMOS API base URL' },
  { name: 'ATMOS_CHECKOUT_BASE_PROD', required: false, description: 'ATMOS production checkout URL' },
  { name: 'ATMOS_CHECKOUT_BASE_TEST', required: false, description: 'ATMOS test checkout URL' },
  { name: 'ATMOS_TEST_MODE', required: false, description: 'Enable ATMOS test mode' },
  { name: 'FIXIE_URL', required: false, description: 'Fixie static IP proxy URL' },
  { name: 'DEV_UNLIMITED_EMAILS', required: false, description: 'Comma-separated dev emails for unlimited access' },
  { name: 'ADMIN_EMAILS', required: false, description: 'Comma-separated admin emails' },
];

const SECTION_INFO = [
  { key: 'core', title: 'Core User Tables', description: 'profiles, profiles_private, user_entitlements, user_devices' },
  { key: 'usage', title: 'Usage Tracking', description: 'usage_counters, daily_usage, usage_events, tool_decisions' },
  { key: 'chat', title: 'Chat Tables', description: 'chat_threads, chat_messages, chat_attachments, attachment_text' },
  { key: 'agent', title: 'Agent/Research', description: 'agent_threads, agent_messages, agent_runs, agent_steps, agent_files' },
  { key: 'spaces', title: 'Circles/Spaces', description: 'spaces, space_members, space_messages, space_files, circle_ai_cards' },
  { key: 'media', title: 'Media Generation', description: 'image_generations, video_generations, video_generation_assets, piapi_queue' },
  { key: 'payments', title: 'Payments', description: 'atmos_cards, atmos_transactions, subscriptions, payment_events' },
  { key: 'misc', title: 'Miscellaneous', description: 'user_files, doc_jobs, beta_feedback, premium_waitlist, search_cache' },
  { key: 'storage', title: 'Storage Buckets', description: 'All 8 storage buckets with RLS policies' },
  { key: 'functions', title: 'Functions & Triggers', description: 'All PL/pgSQL functions, triggers, and views' },
];

export default function MigrationExport() {
  const navigate = useNavigate();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    core: true,
  });

  const copyToClipboard = async (text: string, section: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const downloadSQL = () => {
    const fullSQL = SECTION_INFO.map(s => SQL_SECTIONS[s.key as keyof typeof SQL_SECTIONS]).join('\n\n');
    const blob = new Blob([fullSQL], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bahor-ai-complete-migration.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    SECTION_INFO.forEach(s => { allExpanded[s.key] = true; });
    setExpandedSections(allExpanded);
  };

  const collapseAll = () => {
    setExpandedSections({});
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Bahor AI Migration Export</h1>
            <p className="text-muted-foreground">Complete schema for external Supabase deployment</p>
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Quick Export
            </CardTitle>
            <CardDescription>
              Download the complete SQL schema (40+ tables, functions, triggers, storage)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={downloadSQL} className="gap-2">
              <Download className="h-4 w-4" />
              Download Complete SQL
            </Button>
            <Button variant="outline" onClick={expandAll}>
              Expand All Sections
            </Button>
            <Button variant="outline" onClick={collapseAll}>
              Collapse All
            </Button>
          </CardContent>
        </Card>

        {/* SQL Sections */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">SQL Schema Sections</h2>
          {SECTION_INFO.map(({ key, title, description }) => (
            <Card key={key}>
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleSection(key)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(SQL_SECTIONS[key as keyof typeof SQL_SECTIONS], key);
                      }}
                    >
                      {copiedSection === key ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    {expandedSections[key] ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                </div>
              </CardHeader>
              {expandedSections[key] && (
                <CardContent>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
                    <code>{SQL_SECTIONS[key as keyof typeof SQL_SECTIONS]}</code>
                  </pre>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Secrets Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Edge Function Secrets</CardTitle>
            <CardDescription>
              Add these to your Supabase project: Settings → Edge Functions → Secrets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {SECRETS_LIST.map((secret) => (
                <div
                  key={secret.name}
                  className={`flex items-center justify-between p-2 rounded ${
                    secret.required ? 'bg-destructive/10' : 'bg-muted/50'
                  }`}
                >
                  <div>
                    <code className="font-mono text-sm">{secret.name}</code>
                    <p className="text-xs text-muted-foreground">{secret.description}</p>
                  </div>
                  {secret.required && (
                    <span className="text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded">
                      Required
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Migration Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
              <p>Create a new Supabase project at supabase.com</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
              <p>Download the complete SQL file above</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">3</span>
              <p>Go to SQL Editor in your Supabase dashboard and run the SQL</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">4</span>
              <p>Add all required secrets from the checklist above</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">5</span>
              <p>Update your .env with the new SUPABASE_URL and keys</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">6</span>
              <p>Deploy edge functions: <code className="bg-muted px-1 rounded">supabase functions deploy</code></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
