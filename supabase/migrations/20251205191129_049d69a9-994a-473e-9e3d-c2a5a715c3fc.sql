-- Create private storage bucket for user files
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-files', 'user-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for user-files bucket
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create user_files table for tracking generated documents
CREATE TABLE public.user_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'iloveapi',
  tool text NOT NULL,
  title text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  bucket text NOT NULL DEFAULT 'user-files',
  path text NOT NULL,
  size_bytes bigint NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'success',
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX idx_user_files_user_created ON public.user_files (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_files
CREATE POLICY "Users can view their own files"
ON public.user_files FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files"
ON public.user_files FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
ON public.user_files FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
ON public.user_files FOR DELETE
USING (auth.uid() = user_id);

-- Create doc_jobs table for tracking job status
CREATE TABLE public.doc_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  input jsonb NOT NULL,
  result_file_id uuid NULL REFERENCES public.user_files(id) ON DELETE SET NULL,
  ilove_task text NULL,
  ilove_server text NULL,
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX idx_doc_jobs_user_created ON public.doc_jobs (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.doc_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for doc_jobs
CREATE POLICY "Users can view their own jobs"
ON public.doc_jobs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs"
ON public.doc_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs"
ON public.doc_jobs FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_doc_jobs_updated_at
BEFORE UPDATE ON public.doc_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();