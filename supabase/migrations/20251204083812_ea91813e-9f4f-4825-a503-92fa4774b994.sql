-- Add reaction and meta columns to chat_messages for message actions
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS reaction text CHECK (reaction IN ('like', 'dislike', NULL)),
ADD COLUMN IF NOT EXISTS meta jsonb;

-- Create index on meta for querying variants
CREATE INDEX IF NOT EXISTS idx_chat_messages_meta ON public.chat_messages USING GIN (meta);

-- Allow users to update their own message reactions
DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;

CREATE POLICY "Users can update their own messages" 
ON public.chat_messages 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);