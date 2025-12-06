-- Create table for AI-generated outcome cards in Circles
CREATE TABLE public.circle_ai_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('summary_20', 'summary_100', 'tasks', 'decisions', 'plan', 'meeting_notes')),
  title text NOT NULL,
  content_md text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  source_message_count int NOT NULL DEFAULT 0,
  source_last_message_at timestamptz,
  pinned boolean NOT NULL DEFAULT false
);

-- Create indexes for performance
CREATE INDEX idx_circle_ai_cards_circle_id ON public.circle_ai_cards(circle_id);
CREATE INDEX idx_circle_ai_cards_creator_id ON public.circle_ai_cards(creator_id);
CREATE INDEX idx_circle_ai_cards_created_at ON public.circle_ai_cards(created_at DESC);

-- Enable RLS
ALTER TABLE public.circle_ai_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only circle members can view cards
CREATE POLICY "Circle members can view cards"
ON public.circle_ai_cards
FOR SELECT
USING (is_space_member(circle_id));

-- Only circle members can create cards
CREATE POLICY "Circle members can create cards"
ON public.circle_ai_cards
FOR INSERT
WITH CHECK (is_space_member(circle_id) AND auth.uid() = creator_id);

-- Creator or admin can delete cards
CREATE POLICY "Creator or admin can delete cards"
ON public.circle_ai_cards
FOR DELETE
USING (auth.uid() = creator_id OR is_space_admin(circle_id));

-- Creator or admin can update cards (for pinning)
CREATE POLICY "Creator or admin can update cards"
ON public.circle_ai_cards
FOR UPDATE
USING (auth.uid() = creator_id OR is_space_admin(circle_id));