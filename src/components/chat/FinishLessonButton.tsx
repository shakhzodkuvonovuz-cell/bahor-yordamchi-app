import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLesson } from "@/contexts/LessonContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface FinishLessonButtonProps {
  onComplete?: () => void;
  className?: string;
}

export function FinishLessonButton({ onComplete, className }: FinishLessonButtonProps) {
  const { activeLesson, completeLesson, isTeacherMode } = useLesson();
  const [isLoading, setIsLoading] = useState(false);

  if (!isTeacherMode || !activeLesson) return null;

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      await completeLesson();
      onComplete?.();
    } finally {
      setIsLoading(false);
    }
  };

  const completedSteps = activeLesson.lessonPlan.filter(s => s.completed).length;
  const totalSteps = activeLesson.totalSteps || activeLesson.lessonPlan.length;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Darsni yakunlash
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Darsni yakunlash</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Siz <strong>{activeLesson.topic}</strong> mavzusidagi darsni yakunlamoqchisiz.
            </p>
            <div className="bg-muted rounded-lg p-3 text-sm">
              <p className="font-medium text-foreground mb-1">
                Dars jarayoni: {progressPercent}% yakunlandi
              </p>
              <p className="text-muted-foreground">
                {completedSteps} ta bosqich tugatildi ({totalSteps} dan)
              </p>
            </div>
            <p>
              Darsni yakunlasangiz, AI sizga o'rganganlaringiz haqida qisqacha xulosa beradi.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
          <AlertDialogAction onClick={handleFinish} disabled={isLoading}>
            {isLoading ? "Yakunlanmoqda..." : "Ha, yakunlash"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default FinishLessonButton;
