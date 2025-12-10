-- Enable realtime for agent_runs table so frontend can receive status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_runs;