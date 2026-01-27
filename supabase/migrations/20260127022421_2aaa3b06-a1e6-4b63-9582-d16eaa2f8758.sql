-- Table to track in-flight PiAPI requests for concurrency management
CREATE TABLE public.piapi_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id text,
  status text NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  provider text NOT NULL DEFAULT 'piapi'
);

-- Enable RLS
ALTER TABLE public.piapi_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can manage the queue (edge functions use service role)
CREATE POLICY "Service role full access to piapi_queue"
  ON public.piapi_queue
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Index for fast lookups of active requests
CREATE INDEX idx_piapi_queue_active ON public.piapi_queue (status, created_at) 
  WHERE status IN ('pending', 'processing');

-- Auto-cleanup old completed/failed entries after 1 hour
CREATE OR REPLACE FUNCTION public.cleanup_piapi_queue()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM piapi_queue 
  WHERE (status IN ('completed', 'failed') AND completed_at < now() - interval '1 hour')
     OR (status = 'pending' AND created_at < now() - interval '5 minutes')
     OR (status = 'processing' AND started_at < now() - interval '2 minutes');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to acquire a slot in the queue (atomic operation)
CREATE OR REPLACE FUNCTION public.acquire_piapi_slot(
  p_user_id uuid,
  p_max_concurrent integer DEFAULT 4
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_active_count integer;
  v_slot_id uuid;
BEGIN
  -- Clean up stale entries first
  PERFORM cleanup_piapi_queue();
  
  -- Count active requests (pending + processing)
  SELECT COUNT(*) INTO v_active_count
  FROM piapi_queue
  WHERE status IN ('pending', 'processing');
  
  -- Check if we have room
  IF v_active_count >= p_max_concurrent THEN
    RETURN jsonb_build_object(
      'acquired', false,
      'active_count', v_active_count,
      'max_concurrent', p_max_concurrent,
      'wait_recommended', true
    );
  END IF;
  
  -- Create a slot
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
$$;

-- Function to release a slot when done
CREATE OR REPLACE FUNCTION public.release_piapi_slot(
  p_slot_id uuid,
  p_status text DEFAULT 'completed'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE piapi_queue
  SET status = p_status,
      completed_at = now()
  WHERE id = p_slot_id;
END;
$$;