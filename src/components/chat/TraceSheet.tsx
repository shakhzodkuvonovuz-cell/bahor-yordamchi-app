import { ExternalLink, X, Clock, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTraceStepLabel, getTraceStepIcon, getUILabels } from "@/lib/traceLabels";
import type { MessageTrace, TraceStepData } from "@/types/trace";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { haptic } from "@/lib/haptics";

interface TraceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trace: MessageTrace | null;
  language: string;
}

function formatRelativeTime(ms: number): string {
  return `+${(ms / 1000).toFixed(1)}s`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getDomainFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

interface TraceStepItemProps {
  step: TraceStepData;
  language: string;
  isLast: boolean;
}

function TraceStepItem({ step, language, isLast }: TraceStepItemProps) {
  const icon = getTraceStepIcon(step.step);
  const label = getTraceStepLabel(step.step, language);
  const isComplete = step.endMs !== undefined;
  const relativeTime = formatRelativeTime(step.startMs);
  const duration = step.durMs ? formatDuration(step.durMs) : null;

  return (
    <div className="relative flex items-start gap-3 py-2.5">
      {/* Timeline connector */}
      {!isLast && (
        <div 
          className="absolute left-[15px] top-[30px] w-0.5 h-[calc(100%-10px)] bg-border/50"
          aria-hidden="true"
        />
      )}
      
      {/* Icon container */}
      <div className={cn(
        "relative z-10 flex items-center justify-center w-8 h-8 rounded-full",
        "text-sm shrink-0 transition-colors",
        isComplete 
          ? "bg-primary/10 dark:bg-primary/20" 
          : "bg-muted/80 dark:bg-white/5"
      )}>
        {isComplete ? (
          <span>{icon}</span>
        ) : (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            "text-sm font-medium",
            isComplete ? "text-foreground" : "text-foreground/70"
          )}>
            {label}
          </span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span>{relativeTime}</span>
            {duration && (
              <>
                <span className="text-border">•</span>
                <span className="text-primary/80">{duration}</span>
              </>
            )}
            {isComplete && (
              <Check className="w-3 h-3 text-primary ml-1" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceItem({ title, url }: { title: string; url: string }) {
  const domain = getDomainFromUrl(url);
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => haptic("light")}
      className={cn(
        "flex items-start gap-2.5 p-3 rounded-xl",
        "bg-muted/40 dark:bg-white/5",
        "border border-border/30 dark:border-white/10",
        "hover:bg-muted/60 dark:hover:bg-white/10",
        "transition-colors group"
      )}
    >
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
        "bg-primary/10 dark:bg-primary/20"
      )}>
        <ExternalLink className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {title || domain}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {domain}
        </p>
      </div>
    </a>
  );
}

export function TraceSheet({ open, onOpenChange, trace, language }: TraceSheetProps) {
  const labels = getUILabels(language);
  
  const handleOpenChange = (newOpen: boolean) => {
    haptic(newOpen ? "selection" : "light");
    onOpenChange(newOpen);
  };

  if (!trace) return null;

  const elapsedSeconds = (trace.elapsedMs / 1000).toFixed(1);
  const hasSteps = trace.steps.length > 0;
  const hasSources = trace.sources.length > 0;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85vh] bg-background/95 backdrop-blur-xl border-t border-border/50">
        <DrawerHeader className="border-b border-border/30 pb-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-base font-semibold text-foreground">
              {labels.process}
            </DrawerTitle>
            <DrawerClose asChild>
              <button 
                className={cn(
                  "p-2 rounded-full transition-colors",
                  "hover:bg-muted/80 dark:hover:bg-white/10",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20"
                )}
                onClick={() => haptic("light")}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </DrawerClose>
          </div>
          
          {/* Total time badge */}
          <div className={cn(
            "flex items-center gap-2 mt-3 px-3 py-2 rounded-lg w-fit",
            "bg-primary/10 dark:bg-primary/20",
            "border border-primary/20"
          )}>
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {labels.totalTime}: <span className="font-mono">{elapsedSeconds}s</span>
            </span>
          </div>
        </DrawerHeader>

        <div className="px-4 py-4 space-y-5 overflow-y-auto">
          {/* Steps timeline */}
          {hasSteps && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                {labels.timeline}
              </h4>
              <div className="space-y-0">
                {trace.steps.map((step, idx) => (
                  <TraceStepItem 
                    key={`${step.step}-${idx}`} 
                    step={step} 
                    language={language}
                    isLast={idx === trace.steps.length - 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          <div className="pt-3 border-t border-border/30">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {labels.sources}
            </h4>
            {hasSources ? (
              <div className="space-y-2">
                {trace.sources.map((source, idx) => (
                  <SourceItem key={idx} title={source.title} url={source.url} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/70 italic py-2">
                {labels.noSources}
              </p>
            )}
          </div>
        </div>

        {/* Safe area for mobile */}
        <div className="h-safe-area-inset-bottom" />
      </DrawerContent>
    </Drawer>
  );
}
