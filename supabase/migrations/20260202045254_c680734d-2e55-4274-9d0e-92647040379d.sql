-- Create quiz_scores table for tracking individual quiz attempts
CREATE TABLE public.quiz_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.teacher_lessons(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 3),
  total_questions INTEGER NOT NULL DEFAULT 3,
  topic TEXT NOT NULL,
  step_range TEXT, -- e.g., "1-5", "6-10"
  questions_json JSONB, -- Store the questions and user answers
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quiz_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own quiz scores"
ON public.quiz_scores FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz scores"
ON public.quiz_scores FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add is_quiz_active column to chat_threads for UI state management
ALTER TABLE public.chat_threads 
ADD COLUMN IF NOT EXISTS is_quiz_active BOOLEAN DEFAULT false;

-- Create index for efficient queries
CREATE INDEX idx_quiz_scores_user_id ON public.quiz_scores(user_id);
CREATE INDEX idx_quiz_scores_lesson_id ON public.quiz_scores(lesson_id);
CREATE INDEX idx_quiz_scores_created_at ON public.quiz_scores(created_at DESC);