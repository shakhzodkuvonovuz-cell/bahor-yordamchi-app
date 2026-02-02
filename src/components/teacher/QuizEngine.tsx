/**
 * QuizEngine - Full quiz flow component for Teacher Mode milestone assessments
 * Handles 3-question MCQ quizzes triggered every 5 lesson steps
 */

import { useState, useCallback, useEffect } from "react";
import { QuizCard, QuizSummary, type QuizQuestion, type QuizResult } from "./QuizCard";
import { useLesson, type QuizScore } from "@/contexts/LessonContext";
import { successFeedback } from "@/lib/nativeHaptics";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { BookOpen, Brain, Loader2 } from "lucide-react";

export interface QuizEngineProps {
  questions: QuizQuestion[];
  onComplete?: (passed: boolean, score: number) => void;
  className?: string;
}

export function QuizEngine({ questions, onComplete, className }: QuizEngineProps) {
  const { submitQuizScore, activeLesson, getQuizStepRange } = useLesson();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizPassed, setQuizPassed] = useState<boolean | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const score = results.filter(r => r.isCorrect).length;

  // Handle answer selection
  const handleAnswer = useCallback(async (result: QuizResult) => {
    const newResults = [...results, result];
    setResults(newResults);

    // Wait a moment then move to next question or show summary
    setTimeout(() => {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        // Quiz complete - calculate final score
        const finalScore = newResults.filter(r => r.isCorrect).length;
        handleQuizComplete(newResults, finalScore);
      }
    }, 1500); // Delay to show feedback
  }, [currentQuestionIndex, totalQuestions, results]);

  // Handle quiz completion
  const handleQuizComplete = async (finalResults: QuizResult[], finalScore: number) => {
    setIsSubmitting(true);
    
    const quizScore: QuizScore = {
      step: activeLesson?.lessonPlan.filter(s => s.completed).length || 0,
      score: finalScore,
      total: totalQuestions,
      answers: finalResults.map(r => ({
        questionId: r.questionId,
        isCorrect: r.isCorrect,
      })),
      timestamp: new Date().toISOString(),
    };

    try {
      const passed = await submitQuizScore(quizScore);
      setQuizPassed(passed ?? false);
      setShowSummary(true);
      
      // Trigger celebration for perfect score
      if (finalScore === totalQuestions) {
        await successFeedback();
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#f59e0b'],
        });
      }
      
      onComplete?.(passed ?? false, finalScore);
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Retake quiz (reset state)
  const handleRetake = useCallback(() => {
    setCurrentQuestionIndex(0);
    setResults([]);
    setShowSummary(false);
    setQuizPassed(null);
  }, []);

  // Continue after passing
  const handleContinue = useCallback(() => {
    // Quiz flow complete - parent component handles navigation
    onComplete?.(true, score);
  }, [score, onComplete]);

  if (!questions.length) {
    return (
      <div className={cn("rounded-xl border bg-card p-6 text-center", className)}>
        <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Savolllar yuklanmoqda...</p>
      </div>
    );
  }

  if (showSummary) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Summary header */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Brain className="w-4 h-4" />
          <span>Bosqich {getQuizStepRange()} sinovi</span>
        </div>
        
        <QuizSummary
          score={score}
          total={totalQuestions}
          onRetake={quizPassed === false ? handleRetake : undefined}
          onContinue={quizPassed === true ? handleContinue : undefined}
        />

        {/* Failed message */}
        {quizPassed === false && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
              📚 Keling, bir oz takrorlaymiz
            </p>
            <p className="text-amber-700 dark:text-amber-300 text-xs">
              Oldingi bosqichlarni qayta ko'rib chiqing va keyin qaytadan sinab ko'ring.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Quiz header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="w-4 h-4" />
          <span>Bosqich {getQuizStepRange()} sinovi</span>
        </div>
        <span className="text-sm font-medium text-primary">
          {currentQuestionIndex + 1}/{totalQuestions}
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 justify-center">
        {questions.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-colors",
              idx < results.length && results[idx]?.isCorrect && "bg-emerald-500",
              idx < results.length && !results[idx]?.isCorrect && "bg-destructive",
              idx === currentQuestionIndex && "bg-primary ring-2 ring-primary/30",
              idx > currentQuestionIndex && "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Current question */}
      <QuizCard
        question={currentQuestion}
        onAnswer={handleAnswer}
        disabled={isSubmitting}
      />
    </div>
  );
}

export default QuizEngine;
