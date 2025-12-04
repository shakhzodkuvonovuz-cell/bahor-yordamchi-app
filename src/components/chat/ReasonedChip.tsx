import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUILabels } from "@/lib/traceLabels";
import type { MessageTrace } from "@/types/trace";

interface ReasonedChipProps {
  trace: MessageTrace | null;
  isGenerating: boolean;
  language: string;
  onClick: () => void;
}

export function ReasonedChip({ trace, isGenerating, language, onClick }: ReasonedChipProps) {
  const labels = getUILabels(language);
  
  // Don't render if no trace data and not generating
  if (!trace && !isGenerating) return null;
  
  const elapsedSeconds = trace?.elapsedMs 
    ? (trace.elapsedMs / 1000).toFixed(1) 
    : null;
  
  const isComplete = trace?.isComplete ?? false;

  return (
    <button
      onClick={onClick}
      disabled={!isComplete && !trace}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
        "text-xs font-medium transition-all duration-200",
        "backdrop-blur-md border",
        "bg-white/5 dark:bg-white/5 border-white/10 dark:border-white/10",
        "hover:bg-white/10 dark:hover:bg-white/10",
        "text-foreground/80",
        "focus:outline-none focus:ring-2 focus:ring-primary/20",
        isComplete && "cursor-pointer",
        !isComplete && "cursor-default"
      )}
      style={{
        WebkitBackdropFilter: "blur(12px)",
        backdropFilter: "blur(12px)",
      }}
    >
      {isGenerating && !isComplete ? (
        <>
          <span className="flex gap-0.5">
            <span className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
            <span className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
            <span className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
          </span>
          <span>{labels.reasoning}...</span>
        </>
      ) : (
        <>
          <span className="text-primary">✓</span>
          <span>
            {labels.reasoned} {elapsedSeconds}s
          </span>
          <ChevronDown className="w-3 h-3 text-foreground/50" />
        </>
      )}
    </button>
  );
}
