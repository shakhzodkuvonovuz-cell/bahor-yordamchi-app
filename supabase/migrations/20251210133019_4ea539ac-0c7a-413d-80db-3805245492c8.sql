-- Enable realtime for agent_threads only (agent_messages already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_threads;