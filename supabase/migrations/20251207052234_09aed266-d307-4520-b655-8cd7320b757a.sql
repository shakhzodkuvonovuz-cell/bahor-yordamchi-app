-- Create image_generations table
CREATE TABLE public.image_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prompt_uz TEXT NOT NULL,
  prompt_en TEXT NOT NULL,
  negative_prompt_en TEXT,
  aspect_ratio TEXT DEFAULT '1:1',
  guidance_scale NUMERIC DEFAULT 3.5,
  num_inference_steps INTEGER DEFAULT 4,
  seed BIGINT,
  status TEXT NOT NULL DEFAULT 'done',
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/png',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.image_generations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own generations"
ON public.image_generations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generations"
ON public.image_generations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generations"
ON public.image_generations FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster user queries
CREATE INDEX idx_image_generations_user_id ON public.image_generations(user_id, created_at DESC);