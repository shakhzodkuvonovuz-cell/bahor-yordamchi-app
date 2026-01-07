-- Payment events logging table
CREATE TABLE public.payment_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  event text NOT NULL,
  transaction_id text,
  status text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Service role can insert (from edge functions)
CREATE POLICY "Service role can insert payment_events"
ON public.payment_events
FOR INSERT
WITH CHECK (true);

-- Service role can read all
CREATE POLICY "Service role can read payment_events"
ON public.payment_events
FOR SELECT
USING (true);

-- Users can view their own events
CREATE POLICY "Users can view their own payment_events"
ON public.payment_events
FOR SELECT
USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_payment_events_user_id ON public.payment_events(user_id);
CREATE INDEX idx_payment_events_transaction_id ON public.payment_events(transaction_id);
CREATE INDEX idx_payment_events_created_at ON public.payment_events(created_at DESC);