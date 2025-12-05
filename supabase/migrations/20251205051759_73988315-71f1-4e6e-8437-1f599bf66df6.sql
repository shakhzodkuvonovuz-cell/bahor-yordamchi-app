-- Create beta_feedback table for user feedback/bug reports
CREATE TABLE IF NOT EXISTS public.beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  category text NOT NULL CHECK (category IN ('bug', 'idea', 'other')),
  message text NOT NULL,
  screenshot_url text,
  route text,
  user_agent text,
  app_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own feedback
CREATE POLICY "Users can submit feedback"
ON public.beta_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
ON public.beta_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create storage bucket for feedback screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-screenshots', 'feedback-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for feedback screenshots
CREATE POLICY "Users can upload feedback screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feedback-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own feedback screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'feedback-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);