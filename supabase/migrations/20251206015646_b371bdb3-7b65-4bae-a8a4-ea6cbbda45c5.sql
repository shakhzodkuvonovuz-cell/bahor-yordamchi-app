-- Create space_files table
CREATE TABLE public.space_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES auth.users(id),
  storage_path text NOT NULL UNIQUE,
  original_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz DEFAULT now(),
  pinned boolean DEFAULT false
);

-- Create indexes
CREATE INDEX idx_space_files_space_id ON public.space_files(space_id);
CREATE INDEX idx_space_files_uploader_id ON public.space_files(uploader_id);

-- Enable RLS
ALTER TABLE public.space_files ENABLE ROW LEVEL SECURITY;

-- SELECT: only active members of that space
CREATE POLICY "Members can view space files"
ON public.space_files
FOR SELECT
USING (is_space_member(space_id));

-- INSERT: only active members (uploader_id = auth.uid())
CREATE POLICY "Members can upload files"
ON public.space_files
FOR INSERT
WITH CHECK (is_space_member(space_id) AND auth.uid() = uploader_id);

-- UPDATE: only owner/admin (for pinned toggle)
CREATE POLICY "Admins can update files"
ON public.space_files
FOR UPDATE
USING (is_space_admin(space_id));

-- DELETE: uploader OR owner/admin
CREATE POLICY "Uploader or admin can delete files"
ON public.space_files
FOR DELETE
USING (auth.uid() = uploader_id OR is_space_admin(space_id));

-- Create private storage bucket for space files
INSERT INTO storage.buckets (id, name, public)
VALUES ('space-files', 'space-files', false);

-- Storage policies: Only space members can access files
CREATE POLICY "Space members can upload files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'space-files' 
  AND (storage.foldername(name))[1] = 'spaces'
  AND is_space_member((storage.foldername(name))[2]::uuid)
);

CREATE POLICY "Space members can view files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'space-files'
  AND (storage.foldername(name))[1] = 'spaces'
  AND is_space_member((storage.foldername(name))[2]::uuid)
);

CREATE POLICY "Uploader or admin can delete space files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'space-files'
  AND (storage.foldername(name))[1] = 'spaces'
  AND (
    auth.uid()::text = (storage.foldername(name))[3]
    OR is_space_admin((storage.foldername(name))[2]::uuid)
  )
);