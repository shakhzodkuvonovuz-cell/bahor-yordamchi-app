-- Create tool_decisions table for router logging and debugging
CREATE TABLE public.tool_decisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  message_preview text NOT NULL,
  detected_language text,
  ui_language text,
  image_intent boolean DEFAULT false,
  search_intent boolean DEFAULT false,
  blockers_hit text[] DEFAULT '{}',
  selected_tool text NOT NULL DEFAULT 'text',
  confidence numeric(3,2) DEFAULT 1.00,
  explicit_command boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for user lookups
CREATE INDEX idx_tool_decisions_user_id ON public.tool_decisions(user_id, created_at DESC);

-- Add index for recent decisions debugging
CREATE INDEX idx_tool_decisions_created ON public.tool_decisions(created_at DESC);

-- Enable RLS
ALTER TABLE public.tool_decisions ENABLE ROW LEVEL SECURITY;

-- Service role can insert (edge function)
CREATE POLICY "Service role can insert tool_decisions" 
ON public.tool_decisions 
FOR INSERT 
WITH CHECK (true);

-- Service role can read all
CREATE POLICY "Service role can read tool_decisions" 
ON public.tool_decisions 
FOR SELECT 
USING (true);

-- Users can read their own decisions
CREATE POLICY "Users can read own tool_decisions" 
ON public.tool_decisions 
FOR SELECT 
USING (auth.uid() = user_id);