import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Check, X, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { successFeedback, errorFeedback, lightTap } from "@/lib/nativeHaptics";
import confetti from "canvas-confetti";

export interface QuizQuestion {
  id: string;
  question: string;
  options: {
    label: string; // A, B, C
    text: string;
  }[];
  correctAnswer: string; // "A", "B", or "C"
  explanation: string; // "Nima uchun?" explanation
  videoTimestamp?: string; // Optional video reference
}

export interface QuizResult {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
}

interface QuizCardProps {
  question: QuizQuestion;
  onAnswer: (result: QuizResult) => void;
  showResult?: boolean;
  selectedAnswer?: string;
  disabled?: boolean;
  className?: string;
}

export function QuizCard({
  question,
  onAnswer,
  showResult = false,
  selectedAnswer: externalSelected,
  disabled = false,
  className,
}: QuizCardProps) {
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(showResult);

  const selectedAnswer = externalSelected ?? internalSelected;
  const isCorrect = selectedAnswer === question.correctAnswer;

  const handleSelect = useCallback(async (label: string) => {
    if (disabled || revealed) return;
    
    await lightTap();
    setInternalSelected(label);
    setRevealed(true);

    const correct = label === question.correctAnswer;
    
    if (correct) {
      await successFeedback();
      // Small celebration
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#34d399', '#6ee7b7'],
      });
    } else {
      await errorFeedback();
    }

    onAnswer({
      questionId: question.id,
      selectedAnswer: label,
      isCorrect: correct,
    });
  }, [disabled, revealed, question, onAnswer]);

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 space-y-4",
        "transition-all duration-300",
        revealed && isCorrect && "border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20",
        revealed && !isCorrect && "border-red-500/50 bg-red-50/30 dark:bg-red-950/20",
        className
      )}
    >
      {/* Question */}
      <div className="space-y-2">
        <p className="font-medium text-foreground leading-relaxed">
          {question.question}
        </p>
        {question.videoTimestamp && (
          <p className="text-xs text-muted-foreground italic">
            📺 {question.videoTimestamp}
          </p>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2">
        {question.options.map((option) => {
          const isSelected = selectedAnswer === option.label;
          const isCorrectOption = option.label === question.correctAnswer;
          
          return (
            <button
              key={option.label}
              onClick={() => handleSelect(option.label)}
              disabled={disabled || revealed}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg text-left",
                "border transition-all duration-200",
                "disabled:cursor-not-allowed",
                // Default state
                !revealed && !isSelected && "border-border bg-background hover:bg-accent/50 hover:border-primary/30",
                // Selected but not revealed
                !revealed && isSelected && "border-primary bg-primary/10",
                // Revealed states
                revealed && isCorrectOption && "border-emerald-500 bg-emerald-100 dark:bg-emerald-900/30",
                revealed && isSelected && !isCorrectOption && "border-red-500 bg-red-100 dark:bg-red-900/30",
                revealed && !isSelected && !isCorrectOption && "border-border/50 bg-muted/30 opacity-60"
              )}
            >
              {/* Label Badge */}
              <span
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                  "transition-colors",
                  !revealed && "bg-muted text-muted-foreground",
                  revealed && isCorrectOption && "bg-emerald-500 text-white",
                  revealed && isSelected && !isCorrectOption && "bg-red-500 text-white"
                )}
              >
                {revealed && isCorrectOption ? (
                  <Check className="w-4 h-4" />
                ) : revealed && isSelected && !isCorrectOption ? (
                  <X className="w-4 h-4" />
                ) : (
                  option.label
                )}
              </span>

              {/* Text */}
              <span className="flex-1 text-sm">{option.text}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation (shown after answer) */}
      {revealed && (
        <div
          className={cn(
            "rounded-lg p-3 text-sm animate-fade-in",
            isCorrect 
              ? "bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200"
              : "bg-amber-100/50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200"
          )}
        >
          <p className="font-medium mb-1">
            {isCorrect ? "✅ To'g'ri!" : "❌ Noto'g'ri"}
          </p>
          <p className="text-xs opacity-90">
            <strong>Nima uchun?</strong> {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

// Quiz Summary Card (shown after completing all questions)
interface QuizSummaryProps {
  score: number;
  total: number;
  onRetake?: () => void;
  onContinue?: () => void;
  className?: string;
}

export function QuizSummary({
  score,
  total,
  onRetake,
  onContinue,
  className,
}: QuizSummaryProps) {
  const passed = score >= Math.ceil(total * 0.67); // 2/3 to pass
  const perfect = score === total;

  // Trigger celebration for passing
  useState(() => {
    if (passed) {
      successFeedback();
      if (perfect) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }
  });

  return (
    <div
      className={cn(
        "rounded-xl border p-6 text-center space-y-4",
        passed
          ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/30"
          : "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/30",
        className
      )}
    >
      {/* Icon */}
      <div className="flex justify-center">
        {passed ? (
          <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center animate-scale-in">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center animate-scale-in">
            <RotateCcw className="w-8 h-8 text-white" />
          </div>
        )}
      </div>

      {/* Score */}
      <div>
        <p className="text-3xl font-bold text-foreground">
          {score}/{total}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {perfect
            ? "Zo'r! Mukammal natija! 🎉"
            : passed
            ? "Juda yaxshi! Davom etamiz! 💪"
            : "Keling, bir oz takrorlaymiz 📚"}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-center">
        {!passed && onRetake && (
          <Button variant="outline" onClick={onRetake} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Qayta urinish
          </Button>
        )}
        {passed && onContinue && (
          <Button onClick={onContinue} className="gap-2">
            <Sparkles className="w-4 h-4" />
            Davom etish
          </Button>
        )}
      </div>
    </div>
  );
}

export default QuizCard;
