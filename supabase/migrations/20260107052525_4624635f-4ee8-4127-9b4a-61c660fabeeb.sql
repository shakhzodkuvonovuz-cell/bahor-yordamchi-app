-- Add new columns to video_generations table
ALTER TABLE public.video_generations
ADD COLUMN IF NOT EXISTS mode text DEFAULT 'fast',
ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'text',
ADD COLUMN IF NOT EXISTS source_path text,
ADD COLUMN IF NOT EXISTS prompt_uz text,
ADD COLUMN IF NOT EXISTS prompt_en text,
ADD COLUMN IF NOT EXISTS aspect_ratio text DEFAULT '16:9';

-- Add check constraint for mode
ALTER TABLE public.video_generations
ADD CONSTRAINT video_generations_mode_check 
CHECK (mode IN ('fast', 'pro'));

-- Add check constraint for source_type
ALTER TABLE public.video_generations
ADD CONSTRAINT video_generations_source_type_check 
CHECK (source_type IN ('text', 'image'));

-- Add check constraint for status (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'video_generations_status_check'
  ) THEN
    ALTER TABLE public.video_generations
    ADD CONSTRAINT video_generations_status_check 
    CHECK (status IN ('queued', 'running', 'processing', 'uploading', 'completed', 'failed', 'canceled'));
  END IF;
END $$;

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_video_generations_status ON public.video_generations(status);

-- Create index on user_id + created_at for history queries
CREATE INDEX IF NOT EXISTS idx_video_generations_user_created ON public.video_generations(user_id, created_at DESC);