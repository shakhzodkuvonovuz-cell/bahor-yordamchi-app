import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLesson, type LessonStep } from "@/contexts/LessonContext";
import { useTranslation } from "@/i18n/LanguageProvider";

interface LessonProgressBarProps {
  className?: string;
}

export function LessonProgressBar({ className }: LessonProgressBarProps) {
  const { activeLesson, isTeacherMode } = useLesson();
  const { t } = useTranslation();

  if (!isTeacherMode || !activeLesson) return null;

  const { phase, currentStep, totalSteps, lessonPlan, topic } = activeLesson;

  // Calculate progress percentage
  const progressPercent = totalSteps 
    ? Math.round((currentStep / totalSteps) * 100) 
    : phase === 'diagnosis' ? 10 
    : phase === 'planning' ? 30 
    : 50;

  // Get phase label
  const phaseLabels: Record<string, string> = {
    diagnosis: t('teacher.phase.diagnosis') || "Darajani aniqlash",
    planning: t('teacher.phase.planning') || "Reja tuzish",
    delivery: t('teacher.phase.delivery') || "Dars berish",
    completed: t('teacher.phase.completed') || "Yakunlandi",
  };

  return (
    <div className={cn(
      "bg-card border border-border rounded-xl p-4 shadow-sm",
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {topic}
          </p>
          <p className="text-xs text-muted-foreground">
            {phaseLabels[phase]}
          </p>
        </div>
        {totalSteps && (
          <span className="text-sm font-medium text-primary">
            {currentStep + 1}/{totalSteps}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <Progress value={progressPercent} className="h-2 mb-3" />

      {/* Step Indicators (only in delivery phase) */}
      {phase === 'delivery' && lessonPlan.length > 0 && (
        <div className="flex gap-1">
          {lessonPlan.map((step, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-md text-xs transition-colors",
                i === currentStep 
                  ? "bg-primary/10 text-primary font-medium"
                  : step.completed 
                    ? "bg-accent/50 text-accent-foreground"
                    : "bg-muted/50 text-muted-foreground"
              )}
            >
              {step.completed ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <Circle className="w-3 h-3" />
              )}
              <span className="hidden sm:inline truncate">{i + 1}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LessonProgressBar;
