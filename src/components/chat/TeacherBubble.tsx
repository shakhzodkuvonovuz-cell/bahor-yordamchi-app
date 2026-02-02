import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GraduationCap, Sparkles } from "lucide-react";

interface TeacherBubbleProps {
  children: ReactNode;
  phase?: 'diagnosis' | 'planning' | 'delivery' | 'completed';
  stepNumber?: number;
  totalSteps?: number;
  className?: string;
}

export function TeacherBubble({
  children,
  phase = 'delivery',
  stepNumber,
  totalSteps,
  className,
}: TeacherBubbleProps) {
  // Phase-specific styling
  const phaseStyles: Record<string, string> = {
    diagnosis: "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30",
    planning: "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30",
    delivery: "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30",
    completed: "bg-violet-50/50 dark:bg-violet-950/20 border-violet-200/50 dark:border-violet-800/30",
  };

  const phaseIcons: Record<string, ReactNode> = {
    diagnosis: <Sparkles className="w-3.5 h-3.5" />,
    planning: <GraduationCap className="w-3.5 h-3.5" />,
    delivery: <GraduationCap className="w-3.5 h-3.5" />,
    completed: <Sparkles className="w-3.5 h-3.5" />,
  };

  const phaseLabels: Record<string, string> = {
    diagnosis: "Darajani aniqlash",
    planning: "Reja tuzish",
    delivery: "Dars",
    completed: "Yakunlandi",
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        "transition-colors",
        phaseStyles[phase] || phaseStyles.delivery,
        className
      )}
    >
      {/* Teacher Badge */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
          phase === 'diagnosis' && "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300",
          phase === 'planning' && "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
          phase === 'delivery' && "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300",
          phase === 'completed' && "bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300",
        )}>
          {phaseIcons[phase]}
          <span>{phaseLabels[phase]}</span>
          {stepNumber && totalSteps && (
            <span className="ml-1 opacity-70">
              • {stepNumber}/{totalSteps}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        {children}
      </div>
    </div>
  );
}

export default TeacherBubble;
