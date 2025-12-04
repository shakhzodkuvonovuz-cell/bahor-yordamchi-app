-- Add summary and preview fields to chat_threads
ALTER TABLE public.chat_threads
ADD COLUMN IF NOT EXISTS summary text,
ADD COLUMN IF NOT EXISTS summary_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS last_message_preview text,
ADD COLUMN IF NOT EXISTS message_count int DEFAULT 0;

-- Create index for efficient chat list queries
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_updated 
ON public.chat_threads (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created_desc 
ON public.chat_messages (thread_id, created_at DESC);

-- Function to normalize text for preview (strip markdown, truncate)
CREATE OR REPLACE FUNCTION public.normalize_preview(content text, max_length int DEFAULT 140)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
BEGIN
  -- Remove markdown formatting
  cleaned := regexp_replace(content, '\*\*|__|~~|`{1,3}|#{1,6}\s*|>\s*|\[([^\]]+)\]\([^)]+\)', '\1', 'g');
  -- Remove multiple whitespace/newlines
  cleaned := regexp_replace(cleaned, '\s+', ' ', 'g');
  -- Trim
  cleaned := trim(cleaned);
  -- Truncate with ellipsis
  IF length(cleaned) > max_length THEN
    cleaned := left(cleaned, max_length - 3) || '...';
  END IF;
  RETURN cleaned;
END;
$$;

-- Trigger function to update thread metadata on message insert
CREATE OR REPLACE FUNCTION public.update_thread_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE chat_threads
  SET 
    message_count = message_count + 1,
    updated_at = now(),
    last_message_preview = normalize_preview(NEW.content, 140)
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

-- Create trigger on chat_messages
DROP TRIGGER IF EXISTS on_message_insert_update_thread ON public.chat_messages;
CREATE TRIGGER on_message_insert_update_thread
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_thread_on_message();

-- Backfill message_count for existing threads
UPDATE chat_threads t
SET message_count = (
  SELECT COUNT(*) FROM chat_messages m WHERE m.thread_id = t.id
)
WHERE message_count = 0 OR message_count IS NULL;

-- Backfill last_message_preview for existing threads
UPDATE chat_threads t
SET last_message_preview = (
  SELECT normalize_preview(m.content, 140)
  FROM chat_messages m
  WHERE m.thread_id = t.id
  ORDER BY m.created_at DESC
  LIMIT 1
)
WHERE last_message_preview IS NULL;