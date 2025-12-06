
-- Add new columns to space_messages for full chat functionality
ALTER TABLE public.space_messages 
ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.space_messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS attachments jsonb NULL,
ADD COLUMN IF NOT EXISTS client_id text NULL,
ADD COLUMN IF NOT EXISTS edited_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Rename 'kind' to 'type' for consistency (if kind exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'space_messages' AND column_name = 'kind') THEN
    ALTER TABLE public.space_messages RENAME COLUMN kind TO type;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_space_messages_space_created ON public.space_messages(space_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_space_messages_reply_to ON public.space_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_space_messages_dedupe ON public.space_messages(space_id, sender_id, client_id) WHERE client_id IS NOT NULL;

-- Create space_message_reads table for read receipts
CREATE TABLE IF NOT EXISTS public.space_message_reads (
  message_id uuid NOT NULL REFERENCES public.space_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_space_message_reads_message ON public.space_message_reads(message_id);

-- Enable RLS on space_message_reads
ALTER TABLE public.space_message_reads ENABLE ROW LEVEL SECURITY;

-- RLS policies for space_message_reads
CREATE POLICY "Members can view read receipts"
ON public.space_message_reads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.space_messages sm
    JOIN public.space_members m ON m.space_id = sm.space_id
    WHERE sm.id = space_message_reads.message_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
  )
);

CREATE POLICY "Members can insert their own read receipts"
ON public.space_message_reads
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.space_messages sm
    JOIN public.space_members m ON m.space_id = sm.space_id
    WHERE sm.id = space_message_reads.message_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
  )
);

-- Enable realtime for space_messages and space_message_reads
ALTER PUBLICATION supabase_realtime ADD TABLE public.space_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.space_message_reads;

-- Create storage bucket for space chat files (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('space-chat-files', 'space-chat-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for space-chat-files bucket
CREATE POLICY "Space members can upload chat files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'space-chat-files'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.space_members m
    WHERE m.space_id = (storage.foldername(name))[1]::uuid
    AND m.user_id = auth.uid()
    AND m.status = 'active'
  )
);

CREATE POLICY "Space members can view chat files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'space-chat-files'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.space_members m
    WHERE m.space_id = (storage.foldername(name))[1]::uuid
    AND m.user_id = auth.uid()
    AND m.status = 'active'
  )
);

CREATE POLICY "Space members can delete their own chat files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'space-chat-files'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[2] = auth.uid()::text
);
