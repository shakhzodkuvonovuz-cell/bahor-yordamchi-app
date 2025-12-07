-- Enable realtime for chat tables to support cross-device sync

-- Enable REPLICA IDENTITY FULL for complete row data in realtime events
ALTER TABLE public.chat_threads REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_attachments REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication if not already added
DO $$
BEGIN
  -- Check and add chat_threads
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_threads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
  END IF;
  
  -- Check and add chat_messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
  
  -- Check and add chat_attachments
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_attachments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_attachments;
  END IF;
END $$;