import { BookOpen, GraduationCap, CheckCircle, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useLesson, type LessonStep } from "@/contexts/LessonContext";
import { ResourceCard } from "./ResourceCard";
import { useTranslation } from "@/i18n/LanguageProvider";

interface TeacherDashboardProps {
  onClose?: () => void;
  className?: string;
}

export function TeacherDashboard({ onClose, className }: TeacherDashboardProps) {
  const { 
    activeLesson, 
    isTeacherMode, 
    advanceStep, 
    completeStep,
    completeLesson,
    exitTeacherMode,
  } = useLesson();
  const { t } = useTranslation();

  if (!isTeacherMode || !activeLesson) {
    return null;
  }

  const { topic, phase, currentStep, totalSteps, lessonPlan, resources, diagnosisAnswers } = activeLesson;

  const progressPercent = totalSteps 
    ? Math.round(((currentStep + 1) / totalSteps) * 100) 
    : 0;

  const currentLessonStep = lessonPlan[currentStep];

  const handleNextStep = async () => {
    if (currentLessonStep) {
      await completeStep(currentStep);
    }
    await advanceStep();
  };

  const handleComplete = async () => {
    await completeLesson();
  };

  const handleExit = () => {
    exitTeacherMode();
    onClose?.();
  };

  // Phase labels
  const phaseLabels: Record<string, string> = {
    diagnosis: t('teacher.phase.diagnosis') || "Darajani aniqlash",
    planning: t('teacher.phase.planning') || "Reja tuzish", 
    delivery: t('teacher.phase.delivery') || "Dars jarayonida",
    completed: t('teacher.phase.completed') || "Dars yakunlandi",
  };

  return (
    <div className={cn(
      "bg-background border-l border-border h-full flex flex-col",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">
              {t('teacher.dashboard.title') || "O'qituvchi rejimi"}
            </h2>
            <p className="text-sm text-muted-foreground">{phaseLabels[phase]}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleExit}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Topic */}
      <div className="p-4 border-b border-border bg-card/50">
        <p className="text-sm text-muted-foreground mb-1">
          {t('teacher.dashboard.topic') || "Mavzu"}
        </p>
        <p className="font-medium text-foreground">{topic}</p>
      </div>

      {/* Progress (only in delivery phase) */}
      {phase === 'delivery' && totalSteps && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {t('teacher.dashboard.progress') || "Jarayon"}
            </span>
            <span className="text-sm font-medium text-primary">
              {currentStep + 1}/{totalSteps}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Lesson Plan Steps */}
        {phase === 'delivery' && lessonPlan.length > 0 && (
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-medium text-foreground mb-3">
              {t('teacher.dashboard.lessonPlan') || "Mavzular rejasi"}
            </h3>
            {lessonPlan.map((step, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border transition-colors",
                  index === currentStep 
                    ? "bg-primary/5 border-primary/30"
                    : step.completed 
                      ? "bg-accent/30 border-border"
                      : "bg-card border-border opacity-60"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                  step.completed 
                    ? "bg-primary text-primary-foreground"
                    : index === currentStep 
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                )}>
                  {step.completed ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium",
                    index === currentStep ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                  {index === currentStep && step.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Resources */}
        {resources.length > 0 && (
          <div className="p-4 border-t border-border">
            <h3 className="text-sm font-medium text-foreground mb-3">
              {t('teacher.dashboard.resources') || "Resurslar"}
            </h3>
            <div className="space-y-2">
              {resources.map((resource, index) => (
                <ResourceCard key={index} resource={resource} />
              ))}
            </div>
          </div>
        )}

        {/* Diagnosis Answers */}
        {phase === 'diagnosis' && diagnosisAnswers.length > 0 && (
          <div className="p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">
              {t('teacher.dashboard.answers') || "Javoblaringiz"}
            </h3>
            <div className="space-y-2">
              {diagnosisAnswers.map((qa, index) => (
                <div key={index} className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">{qa.question}</p>
                  <p className="text-sm text-foreground">{qa.answer || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {phase === 'delivery' && (
        <div className="p-4 border-t border-border bg-card/50">
          {currentStep < (totalSteps || 0) - 1 ? (
            <Button 
              onClick={handleNextStep}
              className="w-full gap-2"
            >
              {t('teacher.dashboard.nextStep') || "Keyingi qadam"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleComplete}
              className="w-full gap-2"
              variant="default"
            >
              <CheckCircle className="w-4 h-4" />
              {t('teacher.dashboard.complete') || "Darsni yakunlash"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default TeacherDashboard;
