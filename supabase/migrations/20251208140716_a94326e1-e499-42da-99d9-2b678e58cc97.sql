-- Create attachment_text table for storing extracted text from file attachments
CREATE TABLE IF NOT EXISTS public.attachment_text (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id uuid NOT NULL REFERENCES public.chat_attachments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  text text,
  summary text,
  char_count integer DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_attachment_text UNIQUE (attachment_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attachment_text_attachment_id ON public.attachment_text(attachment_id);
CREATE INDEX IF NOT EXISTS idx_attachment_text_user_id_updated ON public.attachment_text(user_id, updated_at DESC);

-- Enable RLS
ALTER TABLE public.attachment_text ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only read their own text extractions
CREATE POLICY "Users can read their own attachment text"
  ON public.attachment_text
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (edge functions use service role)
CREATE POLICY "Service role full access"
  ON public.attachment_text
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger to update updated_at
CREATE TRIGGER update_attachment_text_updated_at
  BEFORE UPDATE ON public.attachment_text
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();