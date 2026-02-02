-- Add lessons_mastered counter to profiles for Teacher Mode gamification
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS lessons_mastered integer NOT NULL DEFAULT 0;

-- Add quiz_scores JSONB to teacher_lessons for tracking quiz history
ALTER TABLE public.teacher_lessons
ADD COLUMN IF NOT EXISTS quiz_scores jsonb DEFAULT '[]'::jsonb;

-- Update the meta column to include quiz state
COMMENT ON COLUMN public.teacher_lessons.quiz_scores IS 'Array of quiz results: [{step: number, score: number, answers: [...]}]';