-- Add thread_id column to agent_runs table for thread persistence
ALTER TABLE public.agent_runs
ADD COLUMN thread_id uuid REFERENCES public.agent_threads(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_agent_runs_thread_id ON public.agent_runs(thread_id);