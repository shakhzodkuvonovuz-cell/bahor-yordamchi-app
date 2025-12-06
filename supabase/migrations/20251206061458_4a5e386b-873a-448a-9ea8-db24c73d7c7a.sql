-- Drop old problematic storage policies
DROP POLICY IF EXISTS "space_chat_files_select" ON storage.objects;
DROP POLICY IF EXISTS "space_chat_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "space_chat_files_delete" ON storage.objects;

-- Ensure bucket exists (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('space-chat-files', 'space-chat-files', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Create space_message_attachments table for proper metadata storage
CREATE TABLE IF NOT EXISTS public.space_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.space_messages(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL,
  bucket text NOT NULL DEFAULT 'space-chat-files',
  path text NOT NULL,
  filename text NOT NULL,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on the attachments table
ALTER TABLE public.space_message_attachments ENABLE ROW LEVEL SECURITY;

-- RLS: Members can view attachments
CREATE POLICY "space_attachments_select" ON public.space_message_attachments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.space_members sm
    WHERE sm.space_id = space_message_attachments.space_id
      AND sm.user_id = auth.uid()
      AND sm.status = 'active'
  )
);

-- RLS: Members can insert their own attachments
CREATE POLICY "space_attachments_insert" ON public.space_message_attachments
FOR INSERT TO authenticated
WITH CHECK (
  uploader_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.space_members sm
    WHERE sm.space_id = space_message_attachments.space_id
      AND sm.user_id = auth.uid()
      AND sm.status = 'active'
  )
);

-- RLS: Uploader or admin can delete
CREATE POLICY "space_attachments_delete" ON public.space_message_attachments
FOR DELETE TO authenticated
USING (
  uploader_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.space_members sm
    WHERE sm.space_id = space_message_attachments.space_id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('owner', 'admin')
      AND sm.status = 'active'
  )
);

-- Storage policies using path format: {spaceId}/{messageId}/{timestamp}-{filename}
-- This simpler format avoids the complex regex issues

-- SELECT policy: Members can view files in their spaces
CREATE POLICY "space_chat_files_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'space-chat-files'
  AND EXISTS (
    SELECT 1 FROM public.space_members sm
    WHERE sm.space_id = (regexp_match(name, '^([0-9a-fA-F-]{36})/.*'))[1]::uuid
      AND sm.user_id = auth.uid()
      AND sm.status = 'active'
  )
);

-- INSERT policy: Members can upload to their spaces
CREATE POLICY "space_chat_files_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'space-chat-files'
  AND EXISTS (
    SELECT 1 FROM public.space_members sm
    WHERE sm.space_id = (regexp_match(name, '^([0-9a-fA-F-]{36})/.*'))[1]::uuid
      AND sm.user_id = auth.uid()
      AND sm.status = 'active'
  )
);

-- DELETE policy: Uploader or admin can delete
CREATE POLICY "space_chat_files_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'space-chat-files'
  AND EXISTS (
    SELECT 1 FROM public.space_members sm
    WHERE sm.space_id = (regexp_match(name, '^([0-9a-fA-F-]{36})/.*'))[1]::uuid
      AND sm.user_id = auth.uid()
      AND sm.status = 'active'
  )
);