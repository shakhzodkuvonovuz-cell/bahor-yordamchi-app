-- Create agent_files table for file uploads to agent runs
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_files ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only access their own files
CREATE POLICY "Users can view their own agent files"
ON public.agent_files FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent files"
ON public.agent_files FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent files"
ON public.agent_files FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent files"
ON public.agent_files FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_agent_files_run_id ON public.agent_files(run_id);
CREATE INDEX idx_agent_files_user_id ON public.agent_files(user_id);

-- Add constraints column to agent_runs if not exists
ALTER TABLE public.agent_runs ADD COLUMN IF NOT EXISTS constraints_json JSONB DEFAULT '{}'::jsonb;