-- Create temp_html_docs table for serving HTML to iLoveAPI
CREATE TABLE public.temp_html_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  html text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false
);

-- Index for fast lookups
CREATE INDEX idx_temp_html_docs_lookup ON public.temp_html_docs (id, token);
CREATE INDEX idx_temp_html_docs_cleanup ON public.temp_html_docs (expires_at);

-- Enable RLS
ALTER TABLE public.temp_html_docs ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (no client access)
-- The pdf-html edge function uses service role to read