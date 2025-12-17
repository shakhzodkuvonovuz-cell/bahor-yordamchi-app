-- Create video_generations table
CREATE TABLE public.video_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'queued',
  prompt text,
  negative_prompt text,
  params jsonb DEFAULT '{}'::jsonb,
  runpod_job_id text,
  runpod_status jsonb,
  progress numeric,
  error text,
  output_video_path text,
  output_video_url text,
  duration_seconds numeric,
  fps int,
  width int,
  height int,
  seed bigint,
  cost_estimate jsonb
);

-- Create video_generation_assets table for reference uploads
CREATE TABLE public.video_generation_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid REFERENCES public.video_generations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL,
  storage_path text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_generation_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_generations
CREATE POLICY "Users can view their own video generations"
ON public.video_generations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own video generations"
ON public.video_generations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video generations"
ON public.video_generations
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for video_generation_assets
CREATE POLICY "Users can view their own video assets"
ON public.video_generation_assets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own video assets"
ON public.video_generation_assets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video assets"
ON public.video_generation_assets
FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for video generations
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-generations', 'video-generations', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for video assets (reference uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-assets', 'video-assets', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for video-generations bucket
CREATE POLICY "Users can view their own video files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'video-generations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own video files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'video-generations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own video files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'video-generations' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for video-assets bucket
CREATE POLICY "Users can view their own video asset files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'video-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own video asset files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'video-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own video asset files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'video-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger for updated_at
CREATE TRIGGER update_video_generations_updated_at
BEFORE UPDATE ON public.video_generations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_video_generations_user_created ON public.video_generations(user_id, created_at DESC);
CREATE INDEX idx_video_generations_status ON public.video_generations(status);
CREATE INDEX idx_video_generation_assets_generation ON public.video_generation_assets(generation_id);