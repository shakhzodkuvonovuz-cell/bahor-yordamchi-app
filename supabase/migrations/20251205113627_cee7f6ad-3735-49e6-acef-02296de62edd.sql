-- Drop existing permissive policies on chat-attachments bucket
DROP POLICY IF EXISTS "Anyone can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;

-- Secure INSERT policy - only authenticated users can upload to their own folder
CREATE POLICY "Authenticated users upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Secure SELECT policy - users can only view their own attachments
CREATE POLICY "Users view own attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Secure DELETE policy - users can only delete their own attachments
CREATE POLICY "Users delete own attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-attachments' AND (auth.uid())::text = (storage.foldername(name))[1]);