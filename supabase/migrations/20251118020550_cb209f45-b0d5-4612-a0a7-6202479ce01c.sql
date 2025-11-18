-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
);

-- Allow anyone to upload files (authenticated via frontend logic)
CREATE POLICY "Anyone can upload chat attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments');

-- Allow anyone to view chat attachments (public bucket)
CREATE POLICY "Anyone can view chat attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-attachments');