-- Add auto_title and meta columns to circle_ai_cards
ALTER TABLE public.circle_ai_cards 
  ADD COLUMN IF NOT EXISTS auto_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Make title nullable (so we can use auto_title as fallback)
ALTER TABLE public.circle_ai_cards 
  ALTER COLUMN title DROP NOT NULL;

-- Update existing rows to have auto_title based on type and message count
UPDATE public.circle_ai_cards 
SET auto_title = CASE 
  WHEN type = 'summary' THEN 'Xulosa (' || source_message_count || ' xabar)'
  WHEN type = 'tasks' THEN 'Vazifalar'
  WHEN type = 'decisions' THEN 'Qarorlar va ochiq savollar'
  WHEN type = 'plan' THEN 'Bosqichma-bosqich reja'
  WHEN type = 'meeting_notes' THEN 'Uchrashuv bayonnomasi (' || source_message_count || ' xabar)'
  WHEN type = 'issues' THEN 'Muammolar va yechimlar'
  ELSE type
END
WHERE auto_title = '' OR auto_title IS NULL;

-- Create index for filtering by type
CREATE INDEX IF NOT EXISTS idx_circle_ai_cards_type ON public.circle_ai_cards(circle_id, type);
CREATE INDEX IF NOT EXISTS idx_circle_ai_cards_created ON public.circle_ai_cards(circle_id, created_at DESC);