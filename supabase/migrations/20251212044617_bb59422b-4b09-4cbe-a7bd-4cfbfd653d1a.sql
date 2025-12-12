-- Create premium_waitlist table for collecting interested users before payment goes live
CREATE TABLE public.premium_waitlist (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    contact TEXT NOT NULL,
    plan TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.premium_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public form)
CREATE POLICY "Anyone can submit to waitlist"
    ON public.premium_waitlist
    FOR INSERT
    WITH CHECK (true);

-- Only admins can read (no public read access needed)
CREATE POLICY "Service role can read waitlist"
    ON public.premium_waitlist
    FOR SELECT
    USING (false);

-- Add index for efficient queries
CREATE INDEX idx_premium_waitlist_created_at ON public.premium_waitlist(created_at DESC);