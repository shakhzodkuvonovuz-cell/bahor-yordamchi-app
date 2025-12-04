import { ExternalLink, X, Clock } from "lucide-react";
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

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
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

function TraceStepItem({ step, language }: { step: TraceStepData; language: string }) {
  const icon = getTraceStepIcon(step.step);
  const label = getTraceStepLabel(step.step, language);
  const duration = step.durMs ? formatDuration(step.durMs) : null;

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-base">{icon}</span>
      <span className="flex-1 text-sm text-foreground/90">{label}</span>
      {duration && (
        <span className="text-xs text-muted-foreground font-mono">
          {duration}
        </span>
      )}
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
        "flex items-start gap-2 p-2.5 rounded-lg",
        "bg-muted/50 hover:bg-muted transition-colors",
        "group"
      )}
    >
      <ExternalLink className="w-4 h-4 mt-0.5 text-muted-foreground group-hover:text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground line-clamp-2">
          {title || domain}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {domain}
        </p>
      </div>
    </a>
  );
}

export function TraceSheet({ open, onOpenChange, trace, language }: TraceSheetProps) {
  const labels = getUILabels(language);
  
  // Haptic on open
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      haptic("selection");
    }
    onOpenChange(newOpen);
  };

  if (!trace) return null;

  const elapsedSeconds = (trace.elapsedMs / 1000).toFixed(1);
  const hasSteps = trace.steps.length > 0;
  const hasSources = trace.sources.length > 0;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border/50 pb-3">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-base font-semibold">
              {labels.process}
            </DrawerTitle>
            <DrawerClose asChild>
              <button 
                className="p-1.5 rounded-full hover:bg-muted transition-colors"
                onClick={() => haptic("light")}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </DrawerClose>
          </div>
          
          {/* Total time */}
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{labels.totalTime}: <span className="font-mono font-medium text-foreground">{elapsedSeconds}s</span></span>
          </div>
        </DrawerHeader>

        <div className="px-4 py-3 space-y-4 overflow-y-auto">
          {/* Steps timeline */}
          {hasSteps && (
            <div>
              <div className="divide-y divide-border/30">
                {trace.steps.map((step, idx) => (
                  <TraceStepItem key={`${step.step}-${idx}`} step={step} language={language} />
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          <div className="pt-2 border-t border-border/30">
            <h4 className="text-sm font-medium text-foreground mb-2">
              {labels.sources}
            </h4>
            {hasSources ? (
              <div className="space-y-2">
                {trace.sources.map((source, idx) => (
                  <SourceItem key={idx} title={source.title} url={source.url} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
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
