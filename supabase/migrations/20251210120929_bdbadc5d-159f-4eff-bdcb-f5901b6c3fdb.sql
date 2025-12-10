-- Agent threads table for persistent chat history
CREATE TABLE public.agent_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Yangi vazifa',
  rolling_summary TEXT DEFAULT '',
  pinned_context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for user queries
CREATE INDEX idx_agent_threads_user_updated ON public.agent_threads(user_id, updated_at DESC);

-- Enable RLS
ALTER TABLE public.agent_threads ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_threads
CREATE POLICY "Users can view their own threads"
ON public.agent_threads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own threads"
ON public.agent_threads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own threads"
ON public.agent_threads FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own threads"
ON public.agent_threads FOR DELETE
USING (auth.uid() = user_id);

-- Agent messages table
CREATE TABLE public.agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.agent_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_agent_messages_thread ON public.agent_messages(thread_id, created_at ASC);
CREATE INDEX idx_agent_messages_user ON public.agent_messages(user_id);

-- Enable RLS
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_messages
CREATE POLICY "Users can view their own messages"
ON public.agent_messages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages"
ON public.agent_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages"
ON public.agent_messages FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON public.agent_messages FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to update thread updated_at when messages are added
CREATE OR REPLACE FUNCTION public.update_agent_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.agent_threads
  SET updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_agent_thread_timestamp
AFTER INSERT ON public.agent_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_agent_thread_timestamp();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_messages;