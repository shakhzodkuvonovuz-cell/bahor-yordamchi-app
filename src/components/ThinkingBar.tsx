import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Globe, Eye, Check, Brain, Sparkles, Zap, ExternalLink, Search } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";
import bahorLogo from "@/assets/bahor-logo.png";
import clsx from "clsx";

export type ThinkingPhase = 'idle' | 'reasoning' | 'searching' | 'vision' | 'finalising';

export interface ThinkingStatus {
  phase: ThinkingPhase;
  shortLabel: string;
  details?: string[];
  expanded?: boolean;
  taskType?: 'coding' | 'translation' | 'essay' | 'math' | 'general' | 'analysis';
  isDeepReasoning?: boolean;
  reasoningDepth?: 'low' | 'medium' | 'high';
  // New properties for search integration
  searchUsed?: boolean;
  searchUrls?: string[];
  reasoningSteps?: string;
}

interface ThinkingBarProps {
  status: ThinkingStatus;
  onToggleExpand?: () => void;
  isCollapsing?: boolean;
  // New props
  searchUsed?: boolean;
  searchUrls?: string[];
  reasoningSteps?: string;
}

export default function ThinkingBar({ 
  status, 
  onToggleExpand, 
  isCollapsing = false,
  searchUsed = false,
  searchUrls = [],
  reasoningSteps,
}: ThinkingBarProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [animatingStep, setAnimatingStep] = useState<number | null>(null);
  const [progressDotPosition, setProgressDotPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Merge props with status
  const effectiveSearchUsed = searchUsed || status.searchUsed || false;
  const effectiveSearchUrls = searchUrls.length > 0 ? searchUrls : (status.searchUrls || []);
  const effectiveReasoningSteps = reasoningSteps || status.reasoningSteps;

  // Timer effect
  useEffect(() => {
    if (status.phase === 'idle') {
      setElapsedTime(0);
      setCompletedSteps([]);
      setCurrentStep(0);
      setAnimatingStep(null);
      setProgressDotPosition(0);
      return;
    }
    
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [status.phase]);

  // Get steps for progression
  const getSteps = () => {
    const taskType = status.taskType || 'general';
    
    // Add search step if search is being used
    if (effectiveSearchUsed || status.phase === 'searching') {
      return [
        t('thinking.step.searching.query'),
        t('thinking.step.searching.sources'),
        t('thinking.step.searching.analyzing'),
        t('thinking.step.searching.compiling'),
      ];
    }
    
    if (status.phase === 'vision') {
      return [
        t('thinking.step.vision.scanning'),
        t('thinking.step.vision.recognizing'),
        t('thinking.step.vision.understanding'),
        t('thinking.step.vision.formulating'),
      ];
    }
    
    switch (taskType) {
      case 'coding':
        return [
          t('thinking.step.coding.analyzing'),
          t('thinking.step.coding.patterns'),
          t('thinking.step.coding.solution'),
          t('thinking.step.coding.optimizing'),
        ];
      case 'translation':
        return [
          t('thinking.step.translation.understanding'),
          t('thinking.step.translation.context'),
          t('thinking.step.translation.adapting'),
          t('thinking.step.translation.polishing'),
        ];
      case 'essay':
        return [
          t('thinking.step.essay.analyzing'),
          t('thinking.step.essay.structuring'),
          t('thinking.step.essay.writing'),
          t('thinking.step.essay.reviewing'),
        ];
      case 'math':
        return [
          t('thinking.step.math.parsing'),
          t('thinking.step.math.method'),
          t('thinking.step.math.calculating'),
          t('thinking.step.math.verifying'),
        ];
      default:
        return [
          t('thinking.step.understanding'),
          t('thinking.step.selecting'),
          t('thinking.step.drafting'),
          t('thinking.step.checking'),
        ];
    }
  };

  const steps = status.details?.length ? status.details : getSteps();

  // Step progression animation
  useEffect(() => {
    if (status.phase === 'idle') return;
    
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        const next = prev + 1;
        if (next <= steps.length) {
          setAnimatingStep(prev);
          setTimeout(() => {
            setCompletedSteps(curr => [...curr, prev]);
            setAnimatingStep(null);
          }, 200);
          setProgressDotPosition(prev);
        }
        return next < steps.length ? next : prev;
      });
    }, 1800);
    
    return () => clearInterval(stepInterval);
  }, [status.phase, steps.length]);

  if (status.phase === 'idle' && !isCollapsing) return null;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    onToggleExpand?.();
  };

  const getPhaseLabel = () => {
    if (elapsedTime > 8) return t('thinking.slow');
    return status.shortLabel;
  };

  const getTimeEstimate = () => {
    if (status.phase === 'finalising') return t('thinking.almostDone');
    if (elapsedTime < 2) return '~2-4 ' + t('thinking.seconds');
    if (elapsedTime > 6) return t('thinking.fewMoreSeconds');
    return '';
  };

  // Extract domain from URL for display
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <div 
      ref={containerRef}
      className={clsx(
        "w-full max-w-[90%] sm:max-w-[80%] lg:max-w-[75%] mb-3",
        "transition-all duration-300 ease-out",
        isCollapsing && "opacity-0 translate-y-1 scale-[0.98]"
      )}
    >
      <div
        className={clsx(
          "relative overflow-hidden rounded-2xl transition-all duration-300",
          "bg-card/80 backdrop-blur-sm border border-primary/15",
          "shadow-[0_2px_20px_hsl(var(--primary)/0.06)]",
          isExpanded && "shadow-[0_4px_30px_hsl(var(--primary)/0.1)]"
        )}
      >
        {/* Collapsed Bar - Minimal design */}
        <button
          onClick={handleToggle}
          className="relative w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 group"
        >
          {/* Small animated logo */}
          <div className="relative flex-shrink-0">
            <div 
              className="relative w-8 h-8 rounded-lg bg-background/80 border border-primary/20 flex items-center justify-center"
              style={{ animation: status.phase !== 'idle' ? 'pendulum-rotate 4s ease-in-out infinite' : 'none' }}
            >
              <img 
                src={bahorLogo} 
                alt="Bahor AI" 
                className="w-5 h-5 object-contain"
                style={{ filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.3))' }}
              />
            </div>
          </div>

          {/* Status Text */}
          <div className="flex-1 flex flex-col gap-0.5 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <PhaseIcon phase={effectiveSearchUsed ? 'searching' : status.phase} />
              <span className="text-sm font-medium text-foreground truncate">
                {getPhaseLabel()}
              </span>
              
              {/* Search indicator */}
              {effectiveSearchUsed && (
                <span className="flex items-center gap-1 text-xs text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">
                  <Search className="w-3 h-3" />
                  <span className="hidden sm:inline">Web-qidiruv</span>
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {elapsedTime > 0 && (
                <span className="font-mono tabular-nums opacity-70">{elapsedTime}s</span>
              )}
              {!isExpanded && (
                <span className="opacity-60 truncate">
                  {t('thinking.clickToExpand') || '(bosib kengaytiring)'}
                </span>
              )}
            </div>
          </div>

          {/* Thinking dots */}
          <div className="flex items-center gap-1 mr-1">
            {[0, 1, 2].map((i) => (
              <span 
                key={i}
                className="w-1 h-1 rounded-full bg-primary/60"
                style={{
                  animation: 'thinking-bounce 1.4s ease-in-out infinite',
                  animationDelay: `${i * 150}ms`,
                }}
              />
            ))}
          </div>

          <div className="flex-shrink-0 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {/* Thin progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-muted/10 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary/30 via-primary to-primary/30"
            style={{
              width: `${Math.min((currentStep + 1) / steps.length * 100, 100)}%`,
              transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>

        {/* Expanded Panel */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-2 border-t border-primary/10 animate-accordion-down">
            {/* Reasoning steps */}
            <div className="relative space-y-0 mt-3">
              {steps.map((step, index) => {
                const isCompleted = completedSteps.includes(index);
                const isCurrent = currentStep === index;
                const isAnimating = animatingStep === index;
                
                return (
                  <div key={index} className="relative flex items-start">
                    {index < steps.length - 1 && (
                      <div className="absolute left-4 top-8 w-[2px] h-6 overflow-hidden">
                        <div 
                          className={clsx("absolute inset-0 transition-all duration-500", isCompleted ? "opacity-100" : "opacity-20")}
                          style={{
                            background: isCompleted 
                              ? 'linear-gradient(180deg, hsl(var(--primary)), hsl(var(--primary) / 0.2))'
                              : 'linear-gradient(180deg, hsl(var(--primary) / 0.15), transparent)',
                          }}
                        />
                      </div>
                    )}
                    
                    <div 
                      className={clsx("flex items-center gap-3 py-2 transition-all duration-300 w-full")}
                      style={{ animationDelay: `${index * 80}ms`, animation: 'step-fade-in 0.3s ease-out forwards', opacity: 0 }}
                    >
                      <div 
                        className={clsx(
                          "relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                          isCompleted ? "bg-primary/15" : isCurrent ? "bg-primary/10 border border-primary/30" : "bg-muted/20 border border-border/30"
                        )}
                      >
                        {isCompleted ? (
                          <div className={clsx("transition-transform", isAnimating && "animate-checkmark-pop")}>
                            <Check className="w-4 h-4 text-primary" />
                          </div>
                        ) : (
                          <span className={clsx("text-xs font-medium", isCurrent ? "text-primary" : "text-muted-foreground")}>
                            {index + 1}
                          </span>
                        )}
                      </div>

                      <span className={clsx("text-sm leading-relaxed transition-colors duration-300", isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground/70")}>
                        {step}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Search URLs section */}
            {effectiveSearchUrls.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border/20">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Globe className="w-3.5 h-3.5" />
                  <span>{t('thinking.sourcesUsed') || 'Foydalanilgan manbalar'}:</span>
                </div>
                <div className="space-y-1.5">
                  {effectiveSearchUrls.slice(0, 4).map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-primary/80 hover:text-primary transition-colors group/link"
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{getDomain(url)}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Reasoning text if provided */}
            {effectiveReasoningSteps && (
              <div className="mt-4 pt-3 border-t border-border/20">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Brain className="w-3.5 h-3.5" />
                  <span>{t('thinking.reasoningProcess') || 'Fikrlash jarayoni'}:</span>
                </div>
                <p className="text-xs text-muted-foreground/80 leading-relaxed">
                  {effectiveReasoningSteps}
                </p>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-border/10">
              <p className="text-[11px] text-muted-foreground/50 leading-relaxed">{t('thinking.explanation')}</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes thinking-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
          30% { transform: translateY(-3px); opacity: 0.8; }
        }
        @keyframes pendulum-rotate {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(2deg); }
          75% { transform: rotate(-2deg); }
        }
        @keyframes step-fade-in {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes checkmark-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        .animate-checkmark-pop { animation: checkmark-pop 0.2s ease-out; }
      `}</style>
    </div>
  );
}

function PhaseIcon({ phase }: { phase: ThinkingPhase }) {
  const iconClass = "w-3.5 h-3.5 text-primary";
  
  switch (phase) {
    case 'searching':
      return <Globe className={clsx(iconClass, "animate-pulse")} />;
    case 'vision':
      return <Eye className={clsx(iconClass, "animate-pulse")} />;
    case 'finalising':
      return <Zap className={iconClass} />;
    default:
      return <Sparkles className={clsx(iconClass, "animate-pulse")} />;
  }
}
