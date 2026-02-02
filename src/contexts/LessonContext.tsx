import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type LessonPhase = 'diagnosis' | 'planning' | 'delivery' | 'quiz' | 'completed';

export interface LessonStep {
  title: string;
  description: string;
  completed: boolean;
  resources?: LessonResource[];
}

export interface LessonResource {
  type: 'youtube' | 'image' | 'link';
  title: string;
  url: string;
  thumbnail?: string;
  description?: string;
}

export interface DiagnosisQuestion {
  question: string;
  answer?: string;
}

export interface QuizScore {
  step: number;
  score: number;
  total: number;
  answers: { questionId: string; isCorrect: boolean }[];
  timestamp: string;
}

export interface TeacherLesson {
  id: string;
  userId: string;
  threadId: string;
  topic: string;
  phase: LessonPhase;
  currentStep: number;
  totalSteps: number | null;
  diagnosisAnswers: DiagnosisQuestion[];
  lessonPlan: LessonStep[];
  resources: LessonResource[];
  quizScores: QuizScore[];
  startedAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

interface LessonContextType {
  activeLesson: TeacherLesson | null;
  isTeacherMode: boolean;
  isLoadingLesson: boolean;
  isQuizMode: boolean;
  
  // Actions
  startLesson: (threadId: string, topic: string) => Promise<TeacherLesson>;
  loadLesson: (threadId: string) => Promise<TeacherLesson | null>;
  updatePhase: (phase: LessonPhase) => Promise<void>;
  updateDiagnosisAnswers: (answers: DiagnosisQuestion[]) => Promise<void>;
  setLessonPlan: (plan: LessonStep[]) => Promise<void>;
  advanceStep: () => Promise<void>;
  completeStep: (stepIndex: number) => Promise<void>;
  addResource: (resource: LessonResource) => Promise<void>;
  completeLesson: () => Promise<void>;
  exitTeacherMode: () => void;
  
  // Quiz actions
  startQuiz: () => Promise<void>;
  submitQuizScore: (score: QuizScore) => Promise<boolean | undefined>;
  shouldTriggerQuiz: () => boolean;
  incrementLessonsMastered: () => Promise<void>;
  getQuizStepRange: () => string;
}

const LessonContext = createContext<LessonContextType | undefined>(undefined);

// Transform DB row to TeacherLesson
function dbToLesson(row: any): TeacherLesson {
  return {
    id: row.id,
    userId: row.user_id,
    threadId: row.thread_id,
    topic: row.topic,
    phase: row.phase as LessonPhase,
    currentStep: row.current_step,
    totalSteps: row.total_steps,
    diagnosisAnswers: row.diagnosis_answers || [],
    lessonPlan: row.lesson_plan || [],
    resources: row.resources || [],
    quizScores: row.quiz_scores || [],
    startedAt: new Date(row.started_at),
    updatedAt: new Date(row.updated_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
  };
}

export function LessonProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeLesson, setActiveLesson] = useState<TeacherLesson | null>(null);
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);

  const isTeacherMode = !!activeLesson && activeLesson.phase !== 'completed';
  const isQuizMode = activeLesson?.phase === 'quiz';

  // Start a new lesson
  const startLesson = useCallback(async (threadId: string, topic: string): Promise<TeacherLesson> => {
    if (!user) throw new Error('User not authenticated');

    setIsLoadingLesson(true);
    try {
      const { data, error } = await supabase
        .from('teacher_lessons')
        .insert({
          user_id: user.id,
          thread_id: threadId,
          topic,
          phase: 'diagnosis',
          current_step: 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Link lesson to thread
      await supabase
        .from('chat_threads')
        .update({ lesson_id: data.id })
        .eq('id', threadId);

      const lesson = dbToLesson(data);
      setActiveLesson(lesson);
      return lesson;
    } finally {
      setIsLoadingLesson(false);
    }
  }, [user]);

  // Load existing lesson for a thread
  const loadLesson = useCallback(async (threadId: string): Promise<TeacherLesson | null> => {
    if (!user) return null;

    setIsLoadingLesson(true);
    try {
      const { data, error } = await supabase
        .from('teacher_lessons')
        .select('*')
        .eq('thread_id', threadId)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const lesson = dbToLesson(data);
        setActiveLesson(lesson);
        return lesson;
      }
      
      return null;
    } finally {
      setIsLoadingLesson(false);
    }
  }, [user]);

  // Update lesson phase
  const updatePhase = useCallback(async (phase: LessonPhase) => {
    if (!activeLesson) return;

    const { error } = await supabase
      .from('teacher_lessons')
      .update({ phase })
      .eq('id', activeLesson.id);

    if (error) throw error;

    setActiveLesson(prev => prev ? { ...prev, phase } : null);
  }, [activeLesson]);

  // Update diagnosis answers
  const updateDiagnosisAnswers = useCallback(async (answers: DiagnosisQuestion[]) => {
    if (!activeLesson) return;

    const { error } = await supabase
      .from('teacher_lessons')
      .update({ diagnosis_answers: answers as unknown as any })
      .eq('id', activeLesson.id);

    if (error) throw error;

    setActiveLesson(prev => prev ? { ...prev, diagnosisAnswers: answers } : null);
  }, [activeLesson]);

  // Set the lesson plan
  const setLessonPlan = useCallback(async (plan: LessonStep[]) => {
    if (!activeLesson) return;

    const { error } = await supabase
      .from('teacher_lessons')
      .update({ 
        lesson_plan: plan as unknown as any,
        total_steps: plan.length,
        phase: 'delivery',
      })
      .eq('id', activeLesson.id);

    if (error) throw error;

    setActiveLesson(prev => prev ? { 
      ...prev, 
      lessonPlan: plan, 
      totalSteps: plan.length,
      phase: 'delivery',
    } : null);
  }, [activeLesson]);

  // Advance to next step
  const advanceStep = useCallback(async () => {
    if (!activeLesson) return;

    const nextStep = activeLesson.currentStep + 1;
    const isComplete = activeLesson.totalSteps && nextStep >= activeLesson.totalSteps;

    const updates: any = { current_step: nextStep };
    if (isComplete) {
      updates.phase = 'completed';
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('teacher_lessons')
      .update(updates)
      .eq('id', activeLesson.id);

    if (error) throw error;

    setActiveLesson(prev => prev ? { 
      ...prev, 
      currentStep: nextStep,
      phase: isComplete ? 'completed' : prev.phase,
      completedAt: isComplete ? new Date() : null,
    } : null);
  }, [activeLesson]);

  // Complete a specific step
  const completeStep = useCallback(async (stepIndex: number) => {
    if (!activeLesson) return;

    const updatedPlan = activeLesson.lessonPlan.map((step, i) => 
      i === stepIndex ? { ...step, completed: true } : step
    );

    const { error } = await supabase
      .from('teacher_lessons')
      .update({ lesson_plan: updatedPlan as unknown as any })
      .eq('id', activeLesson.id);

    if (error) throw error;

    setActiveLesson(prev => prev ? { ...prev, lessonPlan: updatedPlan } : null);
  }, [activeLesson]);

  // Add a resource
  const addResource = useCallback(async (resource: LessonResource) => {
    if (!activeLesson) return;

    const updatedResources = [...activeLesson.resources, resource];

    const { error } = await supabase
      .from('teacher_lessons')
      .update({ resources: updatedResources as unknown as any })
      .eq('id', activeLesson.id);

    if (error) throw error;

    setActiveLesson(prev => prev ? { ...prev, resources: updatedResources } : null);
  }, [activeLesson]);

  // Complete the lesson
  const completeLesson = useCallback(async () => {
    if (!activeLesson) return;

    const { error } = await supabase
      .from('teacher_lessons')
      .update({ 
        phase: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', activeLesson.id);

    if (error) throw error;

    setActiveLesson(prev => prev ? { 
      ...prev, 
      phase: 'completed',
      completedAt: new Date(),
    } : null);
  }, [activeLesson]);

  // Exit teacher mode (clear active lesson)
  const exitTeacherMode = useCallback(() => {
    setActiveLesson(null);
  }, []);

  // Check if we should trigger a quiz (every 5 steps completed)
  const shouldTriggerQuiz = useCallback(() => {
    if (!activeLesson) return false;
    if (activeLesson.phase !== 'delivery') return false;
    
    const completedSteps = activeLesson.lessonPlan.filter(s => s.completed).length;
    
    // Trigger quiz every 5 steps, but not if already taken for this milestone
    const milestoneNumber = Math.floor(completedSteps / 5);
    if (milestoneNumber === 0) return false;
    
    // Check if we already have a score for this milestone
    const alreadyTaken = activeLesson.quizScores.some(q => q.step === milestoneNumber * 5);
    
    return completedSteps > 0 && 
           completedSteps % 5 === 0 && 
           !alreadyTaken;
  }, [activeLesson]);

  // Start quiz mode and mark thread as quiz active
  const startQuiz = useCallback(async () => {
    if (!activeLesson) return;
    
    // Update lesson phase
    await updatePhase('quiz');
    
    // Mark thread as quiz active
    await supabase
      .from('chat_threads')
      .update({ is_quiz_active: true })
      .eq('id', activeLesson.threadId);
  }, [activeLesson, updatePhase]);

  // Submit quiz score - handles pass/fail logic
  const submitQuizScore = useCallback(async (score: QuizScore) => {
    if (!activeLesson || !user) return;

    const passed = score.score >= 2; // 2/3 or 3/3 to pass
    const updatedScores = [...activeLesson.quizScores, score];

    // Calculate step range for this quiz
    const completedSteps = activeLesson.lessonPlan.filter(s => s.completed).length;
    const milestoneNumber = Math.floor(completedSteps / 5);
    const stepRange = `${(milestoneNumber - 1) * 5 + 1}-${milestoneNumber * 5}`;

    // Save to quiz_scores table for analytics
    await supabase
      .from('quiz_scores')
      .insert({
        user_id: user.id,
        thread_id: activeLesson.threadId,
        lesson_id: activeLesson.id,
        score: score.score,
        total_questions: score.total,
        topic: activeLesson.topic,
        step_range: stepRange,
        questions_json: score.answers,
      });

    // If failed, reset to step before quiz and stay in delivery
    const newPhase = passed ? 'delivery' : 'delivery';
    const newStep = passed ? activeLesson.currentStep : Math.max(0, activeLesson.currentStep - 1);

    const { error } = await supabase
      .from('teacher_lessons')
      .update({ 
        quiz_scores: updatedScores as unknown as any,
        phase: newPhase,
        current_step: newStep,
      })
      .eq('id', activeLesson.id);

    if (error) throw error;

    // Mark thread as quiz inactive
    await supabase
      .from('chat_threads')
      .update({ is_quiz_active: false })
      .eq('id', activeLesson.threadId);

    setActiveLesson(prev => prev ? { 
      ...prev, 
      quizScores: updatedScores,
      phase: newPhase,
      currentStep: newStep,
    } : null);

    // If passed, increment lessons mastered
    if (passed && score.score === score.total) {
      await incrementLessonsMastered();
    }

    return passed;
  }, [activeLesson, user]);

  // Increment lessons mastered in profile
  const incrementLessonsMastered = useCallback(async () => {
    if (!user) return;

    try {
      // Simple increment using raw SQL via update
      const { data: profile } = await supabase
        .from('profiles')
        .select('lessons_mastered')
        .eq('user_id', user.id)
        .single();

      const currentCount = profile?.lessons_mastered ?? 0;

      await supabase
        .from('profiles')
        .update({ lessons_mastered: currentCount + 1 })
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Failed to increment lessons_mastered:', err);
    }
  }, [user]);

  // Get quiz step range for current milestone
  const getQuizStepRange = useCallback(() => {
    if (!activeLesson) return '1-5';
    const completedSteps = activeLesson.lessonPlan.filter(s => s.completed).length;
    const milestoneNumber = Math.floor(completedSteps / 5);
    if (milestoneNumber === 0) return '1-5';
    return `${(milestoneNumber - 1) * 5 + 1}-${milestoneNumber * 5}`;
  }, [activeLesson]);

  return (
    <LessonContext.Provider value={{
      activeLesson,
      isTeacherMode,
      isLoadingLesson,
      isQuizMode,
      startLesson,
      loadLesson,
      updatePhase,
      updateDiagnosisAnswers,
      setLessonPlan,
      advanceStep,
      completeStep,
      addResource,
      completeLesson,
      exitTeacherMode,
      startQuiz,
      submitQuizScore,
      shouldTriggerQuiz,
      incrementLessonsMastered,
      getQuizStepRange,
    }}>
      {children}
    </LessonContext.Provider>
  );
}

export function useLesson() {
  const context = useContext(LessonContext);
  if (context === undefined) {
    throw new Error('useLesson must be used within a LessonProvider');
  }
  return context;
}
