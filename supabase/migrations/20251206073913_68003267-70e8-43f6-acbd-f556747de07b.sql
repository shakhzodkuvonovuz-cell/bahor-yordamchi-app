-- Drop the old restrictive check constraint
ALTER TABLE circle_ai_cards DROP CONSTRAINT circle_ai_cards_type_check;

-- Add new check constraint with all valid action types
ALTER TABLE circle_ai_cards ADD CONSTRAINT circle_ai_cards_type_check 
  CHECK (type IN ('summary', 'tasks', 'decisions', 'plan', 'meeting_notes', 'issues'));