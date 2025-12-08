-- Create user_devices table for session/device limiting
CREATE TABLE public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  device_label text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz NULL,
  UNIQUE(user_id, device_id)
);

-- Create index for efficient queries
CREATE INDEX idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX idx_user_devices_active ON public.user_devices(user_id) WHERE revoked_at IS NULL;

-- Enable RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Users can only view their own devices
CREATE POLICY "Users can view their own devices"
ON public.user_devices
FOR SELECT
USING (auth.uid() = user_id);

-- No direct INSERT/UPDATE/DELETE from client - only via edge function with service role
-- Service role bypasses RLS automatically