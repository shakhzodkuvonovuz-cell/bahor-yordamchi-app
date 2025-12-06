-- Drop existing problematic policies on space-chat-files bucket
DROP POLICY IF EXISTS "space_chat_files_select" ON storage.objects;
DROP POLICY IF EXISTS "space_chat_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "space_chat_files_delete" ON storage.objects;
DROP POLICY IF EXISTS "Members can view space chat files" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload space chat files" ON storage.objects;
DROP POLICY IF EXISTS "Members can delete space chat files" ON storage.objects;
DROP POLICY IF EXISTS "Space members can view chat files" ON storage.objects;
DROP POLICY IF EXISTS "Space members can upload chat files" ON storage.objects;
DROP POLICY IF EXISTS "Space members can delete chat files" ON storage.objects;

-- Create the bucket if it doesn't exist (private bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('space-chat-files', 'space-chat-files', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Policy A: SELECT - Members can view/download files
-- Path format: spaces/<space_id>/<user_id>/...
-- Regex ensures segments 2 and 3 are valid UUIDs before casting
CREATE POLICY "space_chat_files_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'space-chat-files'
  AND name ~ '^spaces/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/'
  AND EXISTS (
    SELECT 1
    FROM public.space_members sm
    WHERE sm.space_id = (split_part(name, '/', 2))::uuid
      AND sm.user_id = auth.uid()
      AND sm.status = 'active'
  )
);

-- Policy B: INSERT - Member can upload only into their own user folder
CREATE POLICY "space_chat_files_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'space-chat-files'
  AND name ~ '^spaces/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/'
  AND (split_part(name, '/', 3))::uuid = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.space_members sm
    WHERE sm.space_id = (split_part(name, '/', 2))::uuid
      AND sm.user_id = auth.uid()
      AND sm.status = 'active'
  )
);

-- Policy C: DELETE - Uploader can delete their own; admins too
CREATE POLICY "space_chat_files_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'space-chat-files'
  AND name ~ '^spaces/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/'
  AND (
    (split_part(name, '/', 3))::uuid = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.space_members sm
      WHERE sm.space_id = (split_part(name, '/', 2))::uuid
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'admin')
        AND sm.status = 'active'
    )
  )
);