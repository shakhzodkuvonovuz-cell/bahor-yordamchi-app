import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Check, Loader2, AlertCircle, Clock, FileText, Search, Cpu, Image, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTraceStepLabel, getTraceStepIcon, getUILabels } from "@/lib/traceLabels";
import type { MessageTrace, TraceStep, TraceStepDetail, TraceStepData } from "@/types/trace";
import { haptic } from "@/lib/haptics";

interface ThinkBarProps {
  trace: MessageTrace | null;
  isGenerating: boolean;
  language: string;
  elapsedLive?: number;
  modelPreference?: 'chat' | 'reasoner';
  onExpandClick?: () => void;
}

type StepState = 'idle' | 'active' | 'done' | 'error';

function getStepState(step: TraceStepData): StepState {
  if (step.endMs !== undefined) {
    return 'done';
  }
  return 'active';
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// Compact step indicator for the bar
function StepIndicator({ step, state, label }: { step: TraceStep; state: StepState; label: string }) {
  const icon = getTraceStepIcon(step);
  
  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all",
        state === 'active' && "bg-primary/10 text-primary animate-pulse",
        state === 'done' && "bg-muted/50 text-foreground/70",
        state === 'error' && "bg-destructive/10 text-destructive",
        state === 'idle' && "text-muted-foreground/50"
      )}
    >
      {state === 'active' ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : state === 'done' ? (
        <Check className="w-3 h-3 text-primary" />
      ) : state === 'error' ? (
        <AlertCircle className="w-3 h-3" />
      ) : (
        <span className="text-[10px]">{icon}</span>
      )}
      <span className="hidden sm:inline font-medium">{label}</span>
    </div>
  );
}

// Details panel with safe metadata
function DetailsPanel({ 
  trace, 
  language,
  modelPreference,
  elapsedMs
}: { 
  trace: MessageTrace | null;
  language: string;
  modelPreference?: 'chat' | 'reasoner';
  elapsedMs: number;
}) {
  const labels = getUILabels(language);
  
  // Aggregate details from all steps
  const aggregatedDetail = useMemo<TraceStepDetail>(() => {
    if (!trace?.steps) return {};
    
    const detail: TraceStepDetail = {};
    
    for (const step of trace.steps) {
      if (step.detail) {
        Object.assign(detail, step.detail);
      }
    }
    
    // Also merge trace-level detail
    if (trace.detail) {
      Object.assign(detail, trace.detail);
    }
    
    return detail;
  }, [trace]);
  
  const hasFiles = aggregatedDetail.filesCount && aggregatedDetail.filesCount > 0;
  const hasSearch = trace?.sources && trace.sources.length > 0;
  const hasImage = aggregatedDetail.imageModel || aggregatedDetail.imageEngine;
  const hasSave = aggregatedDetail.localSaved !== undefined || aggregatedDetail.cloudSaved !== undefined;
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mt-2 pt-2 border-t border-border/30">
      {/* Model */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Cpu className="w-3 h-3" />
        <span>{labels.model}:</span>
        <span className="font-medium text-foreground">
          {modelPreference === 'reasoner' ? labels.modelReasoner : labels.modelFast}
        </span>
      </div>
      
      {/* Files */}
      {hasFiles && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <FileText className="w-3 h-3" />
          <span>{aggregatedDetail.filesCount} {labels.filesCount}</span>
          {aggregatedDetail.extractedChars && (
            <span className="text-foreground/60">
              ({Math.round(aggregatedDetail.extractedChars / 1000)}k)
            </span>
          )}
        </div>
      )}
      
      {/* Web Search */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Search className="w-3 h-3" />
        <span>{labels.webSearch}:</span>
        <span className={cn(
          "font-medium",
          hasSearch ? "text-primary" : "text-muted-foreground"
        )}>
          {hasSearch 
            ? `${trace?.sources?.length || 0} ${labels.sourcesCount}` 
            : labels.searchNotUsed
          }
        </span>
      </div>
      
      {/* Image Generation */}
      {hasImage && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Image className="w-3 h-3" />
          <span>{labels.imageGen}:</span>
          <span className="font-medium text-primary">
            {aggregatedDetail.imageModel || 'flux'}
            {aggregatedDetail.imageDurationMs && ` (${formatDuration(aggregatedDetail.imageDurationMs)})`}
          </span>
        </div>
      )}
      
      {/* Save Status */}
      {hasSave && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Save className="w-3 h-3" />
          <span>{labels.saveStatus}:</span>
          <span className="font-medium">
            {aggregatedDetail.localSaved && <span className="text-primary">{labels.localOk}</span>}
            {aggregatedDetail.cloudSaved !== undefined && (
              <span className={aggregatedDetail.cloudSaved ? "text-primary ml-1" : "text-destructive ml-1"}>
                {aggregatedDetail.cloudSaved ? labels.cloudOk : labels.cloudFail}
              </span>
            )}
          </span>
        </div>
      )}
      
      {/* Elapsed Time */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>{labels.elapsed}:</span>
        <span className="font-mono font-medium text-foreground">
          {formatDuration(elapsedMs)}
        </span>
      </div>
    </div>
  );
}

export function ThinkBar({ 
  trace, 
  isGenerating, 
  language, 
  elapsedLive,
  modelPreference = 'chat',
  onExpandClick
}: ThinkBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const labels = getUILabels(language);
  
  // Don't render if not generating and no trace
  if (!isGenerating && !trace) return null;
  
  const isComplete = trace?.isComplete ?? false;
  const elapsedMs = isComplete ? (trace?.elapsedMs || 0) : (elapsedLive || 0);
  const elapsedSeconds = (elapsedMs / 1000).toFixed(1);
  
  // Get current active step for the compact view
  const activeStep = useMemo(() => {
    if (!trace?.steps || trace.steps.length === 0) {
      return isGenerating ? 'preparing' : null;
    }
    // Find the last step that doesn't have an endMs (still active)
    for (let i = trace.steps.length - 1; i >= 0; i--) {
      if (trace.steps[i].endMs === undefined) {
        return trace.steps[i].step;
      }
    }
    // All done, return last step
    return trace.steps[trace.steps.length - 1].step;
  }, [trace?.steps, isGenerating]);
  
  const handleToggleExpand = () => {
    haptic("selection");
    setIsExpanded(!isExpanded);
  };
  
  const handleBarClick = () => {
    if (isComplete && onExpandClick) {
      haptic("selection");
      onExpandClick();
    }
  };
  
  return (
    <div 
      className={cn(
        "rounded-xl border transition-all duration-200",
        "bg-background/80 backdrop-blur-md",
        "border-border/50 dark:border-white/10",
        "shadow-sm"
      )}
    >
      {/* Main bar */}
      <div 
        className={cn(
          "flex items-center justify-between gap-3 px-3 py-2",
          isComplete && onExpandClick && "cursor-pointer hover:bg-muted/30"
        )}
        onClick={handleBarClick}
      >
        {/* Left: Status indicator + current step */}
        <div className="flex items-center gap-2 min-w-0">
          {isGenerating && !isComplete ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
              <span className="text-sm font-medium text-foreground/80 truncate">
                {activeStep && getTraceStepLabel(activeStep, language)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium text-foreground/80">
                {labels.doneIn} <span className="font-mono">{elapsedSeconds}s</span>
              </span>
            </div>
          )}
        </div>
        
        {/* Right: Step pills + expand button */}
        <div className="flex items-center gap-2">
          {/* Mini step indicators (show last 3 completed steps on larger screens) */}
          <div className="hidden md:flex items-center gap-1">
            {trace?.steps?.slice(-3).map((step, idx) => (
              <div 
                key={`${step.step}-${idx}`}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  step.endMs !== undefined ? "bg-primary" : "bg-primary/30 animate-pulse"
                )}
                title={getTraceStepLabel(step.step, language)}
              />
            ))}
          </div>
          
          {/* Expand/collapse button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleExpand();
            }}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-xs",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-muted/50 transition-colors"
            )}
          >
            <span className="hidden sm:inline">
              {isExpanded ? labels.hideDetails : labels.showDetails}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
      
      {/* Expanded details panel */}
      {isExpanded && (
        <div className="px-3 pb-3">
          <DetailsPanel 
            trace={trace}
            language={language}
            modelPreference={modelPreference}
            elapsedMs={elapsedMs}
          />
        </div>
      )}
    </div>
  );
}

export default ThinkBar;
