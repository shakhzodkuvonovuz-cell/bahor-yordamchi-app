-- Create teacher_lessons table for Socratic teaching flow
CREATE TABLE public.teacher_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  thread_id UUID NOT NULL,
  topic TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'diagnosis' CHECK (phase IN ('diagnosis', 'planning', 'delivery', 'completed')),
  current_step INTEGER NOT NULL DEFAULT 0,
  total_steps INTEGER,
  diagnosis_answers JSONB DEFAULT '[]'::jsonb,
  lesson_plan JSONB DEFAULT '[]'::jsonb,
  resources JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  meta JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT fk_thread FOREIGN KEY (thread_id) REFERENCES public.chat_threads(id) ON DELETE CASCADE
);

-- Create index for user lookups
CREATE INDEX idx_teacher_lessons_user ON public.teacher_lessons(user_id);
CREATE INDEX idx_teacher_lessons_thread ON public.teacher_lessons(thread_id);
CREATE UNIQUE INDEX idx_teacher_lessons_active ON public.teacher_lessons(user_id, thread_id) WHERE phase != 'completed';

-- Enable RLS
ALTER TABLE public.teacher_lessons ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own lessons"
  ON public.teacher_lessons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lessons"
  ON public.teacher_lessons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lessons"
  ON public.teacher_lessons FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lessons"
  ON public.teacher_lessons FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_teacher_lessons_updated_at
  BEFORE UPDATE ON public.teacher_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add lesson_id column to chat_threads for quick reference
ALTER TABLE public.chat_threads 
ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.teacher_lessons(id) ON DELETE SET NULL;

-- Index for lesson lookups on threads
CREATE INDEX IF NOT EXISTS idx_chat_threads_lesson ON public.chat_threads(lesson_id) WHERE lesson_id IS NOT NULL;