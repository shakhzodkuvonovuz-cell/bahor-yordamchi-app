import { ChevronDown, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUILabels } from "@/lib/traceLabels";
import type { MessageTrace } from "@/types/trace";
import { haptic } from "@/lib/haptics";

interface ReasonedChipProps {
  trace: MessageTrace | null;
  isGenerating: boolean;
  language: string;
  elapsedLive?: number; // Live elapsed time in ms while generating
  onClick: () => void;
}

export function ReasonedChip({ 
  trace, 
  isGenerating, 
  language, 
  elapsedLive,
  onClick 
}: ReasonedChipProps) {
  const labels = getUILabels(language);
  
  // Always render if generating OR if we have trace data
  if (!trace && !isGenerating) return null;
  
  const isComplete = trace?.isComplete ?? false;
  
  // Use live elapsed time while generating, otherwise use final trace time
  const elapsedMs = isComplete ? trace?.elapsedMs : elapsedLive;
  const elapsedSeconds = elapsedMs 
    ? (elapsedMs / 1000).toFixed(1) 
    : "0.0";

  const handleClick = () => {
    if (isComplete || trace) {
      haptic("selection");
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!isComplete && !trace}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        "text-xs font-medium transition-all duration-200",
        "backdrop-blur-md border",
        "bg-background/60 dark:bg-white/5",
        "border-border/50 dark:border-white/10",
        "text-foreground/80",
        "focus:outline-none focus:ring-2 focus:ring-primary/20",
        isComplete && "cursor-pointer hover:bg-muted/80 dark:hover:bg-white/10",
        !isComplete && "cursor-default"
      )}
      style={{
        WebkitBackdropFilter: "blur(12px)",
        backdropFilter: "blur(12px)",
      }}
    >
      {isGenerating && !isComplete ? (
        <>
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
          <span className="text-foreground/70">
            {labels.generating}… <span className="font-mono">{elapsedSeconds}s</span>
          </span>
        </>
      ) : (
        <>
          <Check className="w-3.5 h-3.5 text-primary" />
          <span>
            {labels.doneIn} <span className="font-mono">{elapsedSeconds}s</span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-foreground/50 ml-0.5" />
        </>
      )}
    </button>
  );
}
