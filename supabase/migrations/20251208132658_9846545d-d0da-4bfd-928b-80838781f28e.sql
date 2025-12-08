-- Create usage_events table for observability
CREATE TABLE public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('chat', 'search', 'image_gen')),
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX idx_usage_events_user_created ON public.usage_events (user_id, created_at DESC);
CREATE INDEX idx_usage_events_type_created ON public.usage_events (event_type, created_at DESC);
CREATE INDEX idx_usage_events_created ON public.usage_events (created_at DESC);

-- Enable RLS
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (server-side only)
CREATE POLICY "Service role can insert usage_events"
ON public.usage_events
FOR INSERT
TO service_role
WITH CHECK (true);

-- Service role can read all
CREATE POLICY "Service role can read usage_events"
ON public.usage_events
FOR SELECT
TO service_role
USING (true);

-- Users can read their own events (optional, for future dashboard)
CREATE POLICY "Users can read own usage_events"
ON public.usage_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Aggregation RPC for admin usage summary
CREATE OR REPLACE FUNCTION public.get_usage_summary(p_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'date', p_date,
    'chat', jsonb_build_object(
      'total_calls', COUNT(*) FILTER (WHERE event_type = 'chat'),
      'avg_duration_ms', ROUND(AVG((meta->>'duration_ms')::numeric) FILTER (WHERE event_type = 'chat')),
      'total_tokens_in', SUM((meta->>'tokens_in')::int) FILTER (WHERE event_type = 'chat'),
      'total_tokens_out', SUM((meta->>'tokens_out')::int) FILTER (WHERE event_type = 'chat'),
      'models', jsonb_object_agg(
        COALESCE(meta->>'model', 'unknown'),
        COUNT(*) FILTER (WHERE event_type = 'chat')
      ) FILTER (WHERE event_type = 'chat')
    ),
    'search', jsonb_build_object(
      'total_calls', COUNT(*) FILTER (WHERE event_type = 'search'),
      'cache_hits', COUNT(*) FILTER (WHERE event_type = 'search' AND (meta->>'cache_hit')::boolean = true),
      'cache_misses', COUNT(*) FILTER (WHERE event_type = 'search' AND (meta->>'cache_hit')::boolean = false),
      'avg_google_call_ms', ROUND(AVG((meta->>'google_call_ms')::numeric) FILTER (WHERE event_type = 'search' AND (meta->>'cache_hit')::boolean = false))
    ),
    'image_gen', jsonb_build_object(
      'total_calls', COUNT(*) FILTER (WHERE event_type = 'image_gen'),
      'success', COUNT(*) FILTER (WHERE event_type = 'image_gen' AND (meta->>'success')::boolean = true),
      'failed', COUNT(*) FILTER (WHERE event_type = 'image_gen' AND (meta->>'success')::boolean = false),
      'avg_duration_ms', ROUND(AVG((meta->>'duration_ms')::numeric) FILTER (WHERE event_type = 'image_gen'))
    )
  ) INTO v_result
  FROM usage_events
  WHERE created_at >= p_date::timestamptz
    AND created_at < (p_date + 1)::timestamptz;
  
  RETURN v_result;
END;
$$;