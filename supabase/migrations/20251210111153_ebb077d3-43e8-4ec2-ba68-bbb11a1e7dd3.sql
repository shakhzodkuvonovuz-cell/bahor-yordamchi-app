-- Create agent_runs table
CREATE TABLE public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  goal text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  plan jsonb DEFAULT '[]'::jsonb,
  final_output text,
  sources jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create agent_steps table
CREATE TABLE public.agent_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  step_index integer NOT NULL,
  title text NOT NULL,
  rationale text,
  status text NOT NULL DEFAULT 'pending',
  tool_name text,
  tool_input jsonb,
  tool_output jsonb,
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_steps ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_runs
CREATE POLICY "Users can view their own runs"
ON public.agent_runs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own runs"
ON public.agent_runs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own runs"
ON public.agent_runs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own runs"
ON public.agent_runs FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for agent_steps (via run ownership)
CREATE POLICY "Users can view steps of their runs"
ON public.agent_steps FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.agent_runs
  WHERE agent_runs.id = agent_steps.run_id
  AND agent_runs.user_id = auth.uid()
));

CREATE POLICY "Users can create steps for their runs"
ON public.agent_steps FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.agent_runs
  WHERE agent_runs.id = agent_steps.run_id
  AND agent_runs.user_id = auth.uid()
));

CREATE POLICY "Users can update steps of their runs"
ON public.agent_steps FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.agent_runs
  WHERE agent_runs.id = agent_steps.run_id
  AND agent_runs.user_id = auth.uid()
));

-- Indexes
CREATE INDEX idx_agent_runs_user_id ON public.agent_runs(user_id);
CREATE INDEX idx_agent_runs_status ON public.agent_runs(status);
CREATE INDEX idx_agent_steps_run_id ON public.agent_steps(run_id);
CREATE INDEX idx_agent_steps_status ON public.agent_steps(status);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_steps;

-- Trigger for updated_at
CREATE TRIGGER update_agent_runs_updated_at
BEFORE UPDATE ON public.agent_runs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();