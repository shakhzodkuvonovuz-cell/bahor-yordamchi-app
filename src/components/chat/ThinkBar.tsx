import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Check, Sparkles, FileText, Image, Clock, Globe, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTraceStepLabel, getUILabels } from "@/lib/traceLabels";
import type { MessageTrace, TraceStepDetail } from "@/types/trace";
import { haptic } from "@/lib/haptics";

interface ThinkBarProps {
  trace: MessageTrace | null;
  isGenerating: boolean;
  language: string;
  elapsedLive?: number;
  modelPreference?: 'chat' | 'reasoner';
  onExpandClick?: () => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// Typewriter text component
function TypewriterText({ text, speed = 30 }: { text: string; speed?: number }) {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const prevTextRef = useRef(text);
  
  useEffect(() => {
    // If text changed, start typing new text
    if (text !== prevTextRef.current) {
      setDisplayText("");
      setIsTyping(true);
      prevTextRef.current = text;
    }
  }, [text]);
  
  useEffect(() => {
    if (!isTyping || displayText === text) {
      setIsTyping(false);
      return;
    }
    
    const timeout = setTimeout(() => {
      setDisplayText(text.slice(0, displayText.length + 1));
    }, speed);
    
    return () => clearTimeout(timeout);
  }, [displayText, text, speed, isTyping]);
  
  return (
    <span className="inline-flex items-center">
      <span>{displayText}</span>
      {isTyping && (
        <span className="inline-block w-[2px] h-[14px] bg-primary ml-0.5 animate-[pulse_0.8s_ease-in-out_infinite]" />
      )}
    </span>
  );
}

// Shimmer animation for loading state
function ShimmerDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-[pulse_1.4s_ease-in-out_infinite]" />
      <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-[pulse_1.4s_ease-in-out_0.2s_infinite]" />
      <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-[pulse_1.4s_ease-in-out_0.4s_infinite]" />
    </div>
  );
}

// Details panel with safe metadata - ChatGPT style
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
  
  const aggregatedDetail = useMemo<TraceStepDetail>(() => {
    if (!trace?.steps) return {};
    
    const detail: TraceStepDetail = {};
    
    for (const step of trace.steps) {
      if (step.detail) {
        Object.assign(detail, step.detail);
      }
    }
    
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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground mt-2 pt-2 border-t border-border/20">
      {/* Model */}
      <div className="flex items-center gap-1.5">
        <Zap className="w-3 h-3" />
        <span className="text-foreground/70">
          {modelPreference === 'reasoner' ? labels.modelReasoner : labels.modelFast}
        </span>
      </div>
      
      {/* Files */}
      {hasFiles && (
        <div className="flex items-center gap-1.5">
          <FileText className="w-3 h-3" />
          <span>{aggregatedDetail.filesCount} {labels.filesCount}</span>
        </div>
      )}
      
      {/* Web Search */}
      {hasSearch && (
        <div className="flex items-center gap-1.5">
          <Globe className="w-3 h-3 text-primary" />
          <span className="text-primary">
            {trace?.sources?.length || 0} {labels.sourcesCount}
          </span>
        </div>
      )}
      
      {/* Image Generation */}
      {hasImage && (
        <div className="flex items-center gap-1.5">
          <Image className="w-3 h-3 text-primary" />
          <span className="text-primary">
            {aggregatedDetail.imageModel || 'flux'}
          </span>
        </div>
      )}
      
      {/* Elapsed Time */}
      <div className="flex items-center gap-1.5 ml-auto">
        <Clock className="w-3 h-3" />
        <span className="font-mono text-foreground/70">
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
  
  if (!isGenerating && !trace) return null;
  
  const isComplete = trace?.isComplete ?? false;
  const elapsedMs = isComplete ? (trace?.elapsedMs || 0) : (elapsedLive || 0);
  const elapsedSeconds = (elapsedMs / 1000).toFixed(1);
  
  // Get current active step
  const activeStep = useMemo(() => {
    if (!trace?.steps || trace.steps.length === 0) {
      return isGenerating ? 'thinking' : null;
    }
    for (let i = trace.steps.length - 1; i >= 0; i--) {
      if (trace.steps[i].endMs === undefined) {
        return trace.steps[i].step;
      }
    }
    return trace.steps[trace.steps.length - 1].step;
  }, [trace?.steps, isGenerating]);
  
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
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
        "inline-flex flex-col transition-all duration-300 ease-out",
        "text-sm text-muted-foreground",
        isExpanded && "w-full max-w-md"
      )}
    >
      {/* Main compact bar */}
      <div 
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
          "bg-muted/50 dark:bg-white/5",
          "border border-border/30 dark:border-white/10",
          "transition-all duration-200",
          isComplete && onExpandClick && "cursor-pointer hover:bg-muted/70 dark:hover:bg-white/10"
        )}
        onClick={handleBarClick}
      >
        {/* Status icon */}
        {isGenerating && !isComplete ? (
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span className="text-foreground/70 font-medium min-w-[80px]">
              {activeStep && (
                <TypewriterText 
                  text={getTraceStepLabel(activeStep, language)} 
                  speed={25}
                />
              )}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-primary" />
            <span className="text-foreground/70">
              {labels.doneIn} <span className="font-mono">{elapsedSeconds}s</span>
            </span>
          </div>
        )}
        
        {/* Expand button */}
        <button
          onClick={handleToggleExpand}
          className={cn(
            "flex items-center justify-center w-5 h-5 rounded-full",
            "text-muted-foreground/60 hover:text-foreground/70",
            "hover:bg-foreground/5 transition-colors",
            "-mr-1"
          )}
        >
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      
      {/* Expanded details */}
      {isExpanded && (
        <div className={cn(
          "mt-2 px-3 py-2 rounded-xl",
          "bg-muted/30 dark:bg-white/5",
          "border border-border/20 dark:border-white/5",
          "animate-fade-in"
        )}>
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