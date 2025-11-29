import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Globe, Eye, Check, Brain, Sparkles, Zap } from "lucide-react";
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
}

interface ThinkingBarProps {
  status: ThinkingStatus;
  onToggleExpand?: () => void;
  isCollapsing?: boolean;
}

export default function ThinkingBar({ status, onToggleExpand, isCollapsing = false }: ThinkingBarProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullReasoning, setShowFullReasoning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [animatingStep, setAnimatingStep] = useState<number | null>(null);
  const [progressDotPosition, setProgressDotPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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
    
    if (status.phase === 'searching') {
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

  const getReasoningExplanation = (stepIndex: number) => {
    const explanations = [
      t('thinking.reason.step1'),
      t('thinking.reason.step2'),
      t('thinking.reason.step3'),
      t('thinking.reason.step4'),
    ];
    return explanations[stepIndex] || '';
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

  const getDepthBars = () => {
    const depth = status.reasoningDepth || 'medium';
    const bars = depth === 'low' ? 2 : depth === 'medium' ? 3 : 4;
    return { bars, label: depth.charAt(0).toUpperCase() + depth.slice(1) };
  };

  return (
    <div 
      ref={containerRef}
      className={clsx(
        "w-full max-w-[90%] sm:max-w-[80%] lg:max-w-[75%] mt-4 mb-6",
        "transition-all duration-300 ease-out",
        isCollapsing && "opacity-0 translate-y-1 scale-[0.98]"
      )}
    >
      <div
        className={clsx(
          "relative overflow-hidden rounded-[18px] transition-all duration-300",
          "bg-card border border-primary/20",
          "shadow-[0_0_40px_hsl(var(--primary)/0.08),inset_0_1px_0_hsl(0_0%_100%/0.03)]",
          isExpanded && "shadow-[0_0_60px_hsl(var(--primary)/0.12),inset_0_1px_0_hsl(0_0%_100%/0.03)]"
        )}
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 rounded-[18px] opacity-30 pointer-events-none">
          <div 
            className="absolute inset-0 rounded-[18px]"
            style={{ background: 'radial-gradient(ellipse at top, hsl(var(--primary) / 0.1), transparent 60%)' }}
          />
        </div>

        {/* Collapsed Bar */}
        <button
          onClick={handleToggle}
          className="relative w-full flex items-center gap-4 px-4 py-4 sm:px-5 sm:py-5 transition-all duration-200 group"
        >
          {/* Animated Logo */}
          <div className="relative flex-shrink-0">
            <div 
              className="absolute -inset-2 rounded-2xl opacity-40"
              style={{
                background: 'radial-gradient(circle, hsl(var(--primary) / 0.3), transparent)',
                animation: 'breathing-glow 2s ease-in-out infinite',
              }}
            />
            <div className="absolute -inset-1 rounded-xl">
              <div 
                className="absolute inset-0 rounded-xl opacity-20"
                style={{ background: 'hsl(var(--primary) / 0.3)', animation: 'pulse-ring 2s ease-out infinite' }}
              />
            </div>
            <div 
              className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-background border border-primary/30 flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.25)]"
              style={{ animation: 'pendulum-rotate 4s ease-in-out infinite' }}
            >
              <img 
                src={bahorLogo} 
                alt="Bahor AI" 
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
                style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.4))' }}
              />
            </div>
          </div>

          {/* Status Text */}
          <div className="flex-1 flex flex-col gap-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <PhaseIcon phase={status.phase} />
              <span className="text-[15px] sm:text-base font-medium text-foreground truncate">
                {getPhaseLabel()}
              </span>
            </div>
            
            {status.isDeepReasoning && (
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-primary" />
                <span className="text-[13px] text-primary/80">{t('thinking.deepReasoning')}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              {elapsedTime > 0 && (
                <span className="font-mono tabular-nums opacity-70">{elapsedTime}s</span>
              )}
              {getTimeEstimate() && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="opacity-70">{getTimeEstimate()}</span>
                </>
              )}
            </div>
          </div>

          {/* Depth Meter */}
          {status.isDeepReasoning && (
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <div className="flex gap-0.5">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={clsx(
                      "w-1.5 h-4 rounded-sm transition-all duration-300",
                      i < getDepthBars().bars
                        ? "bg-gradient-to-t from-primary/60 to-primary shadow-[0_0_6px_hsl(var(--primary)/0.4)]"
                        : "bg-muted/30"
                    )}
                  />
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                {getDepthBars().label}
              </span>
            </div>
          )}

          {/* Thinking dots */}
          <div className="flex items-center gap-1.5 mr-2">
            {[0, 1, 2].map((i) => (
              <span 
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary"
                style={{
                  animation: 'thinking-bounce 1.4s ease-in-out infinite',
                  animationDelay: `${i * 150}ms`,
                  boxShadow: '0 0 6px hsl(var(--primary) / 0.5)',
                }}
              />
            ))}
          </div>

          <div className="flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-muted/20 overflow-hidden">
          <div 
            className="h-full relative"
            style={{
              width: `${Math.min((currentStep + 1) / steps.length * 100, 100)}%`,
              transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div 
              className="absolute inset-0 bg-gradient-to-r from-primary/40 via-primary to-primary/40"
              style={{ boxShadow: '0 0 10px hsl(var(--primary) / 0.5)' }}
            />
            <div 
              className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary"
              style={{ boxShadow: '0 0 12px hsl(var(--primary)), 0 0 20px hsl(var(--primary) / 0.6)' }}
            />
          </div>
        </div>

        {/* Expanded Panel */}
        {isExpanded && (
          <div className="px-4 pb-5 sm:px-5 sm:pb-6 pt-2 border-t border-primary/10 animate-accordion-down">
            <div className="relative space-y-0 mt-4">
              {steps.map((step, index) => {
                const isCompleted = completedSteps.includes(index);
                const isCurrent = currentStep === index;
                const isAnimating = animatingStep === index;
                
                return (
                  <div key={index} className="relative flex items-start">
                    {index < steps.length - 1 && (
                      <div className="absolute left-5 top-11 w-[2px] h-10 overflow-hidden">
                        <div 
                          className={clsx("absolute inset-0 transition-all duration-700", isCompleted ? "opacity-100" : "opacity-30")}
                          style={{
                            background: isCompleted 
                              ? 'linear-gradient(180deg, hsl(var(--primary)), hsl(var(--primary) / 0.3))'
                              : 'linear-gradient(180deg, hsl(var(--primary) / 0.2), transparent)',
                          }}
                        />
                        {progressDotPosition === index && !isCompleted && (
                          <div 
                            className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary"
                            style={{
                              boxShadow: '0 0 8px hsl(var(--primary)), 0 0 16px hsl(var(--primary) / 0.6)',
                              animation: 'travel-down 0.7s ease-out forwards',
                            }}
                          />
                        )}
                      </div>
                    )}
                    
                    <div 
                      className={clsx("flex items-start gap-4 py-3 transition-all duration-300 w-full", isCurrent && "scale-[1.01]")}
                      style={{ animationDelay: `${index * 100}ms`, animation: 'step-fade-in 0.4s ease-out forwards', opacity: 0 }}
                    >
                      <div 
                        className={clsx(
                          "relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                          isCompleted ? "bg-primary/20" : isCurrent ? "bg-primary/10 border border-primary/40" : "bg-muted/30 border border-border/50"
                        )}
                        style={{
                          boxShadow: isCompleted 
                            ? '0 0 20px hsl(var(--primary) / 0.4), inset 0 0 10px hsl(var(--primary) / 0.2)'
                            : isCurrent ? '0 0 15px hsl(var(--primary) / 0.3)' : 'none',
                        }}
                      >
                        {isCompleted ? (
                          <div className={clsx("transition-transform", isAnimating && "animate-checkmark-pop")}>
                            <Check className="w-5 h-5 text-primary" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.6))' }} />
                          </div>
                        ) : (
                          <span className={clsx("text-sm font-semibold", isCurrent ? "text-primary" : "text-muted-foreground")}>
                            {index + 1}
                          </span>
                        )}
                        
                        {isAnimating && (
                          <div 
                            className="absolute inset-0 rounded-full"
                            style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.4), transparent)', animation: 'glow-burst 0.3s ease-out forwards' }}
                          />
                        )}
                        
                        {isCurrent && !isCompleted && (
                          <div 
                            className="absolute inset-0 rounded-full"
                            style={{ background: 'hsl(var(--primary) / 0.2)', animation: 'pulse-ring 1.5s ease-out infinite' }}
                          />
                        )}
                      </div>

                      <div className="flex-1 pt-2">
                        <span className={clsx("text-[15px] sm:text-base leading-relaxed transition-colors duration-300", isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground")}>
                          {step}
                        </span>
                        {showFullReasoning && (
                          <p className="mt-2 text-[13px] text-muted-foreground/70 leading-relaxed">{getReasoningExplanation(index)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowFullReasoning(!showFullReasoning)}
              className="mt-5 flex items-center gap-2 text-[13px] sm:text-sm text-primary/80 hover:text-primary transition-colors group"
            >
              <Brain className="w-4 h-4" />
              <span>{showFullReasoning ? t('thinking.hideReasoning') : t('thinking.showReasoning')}</span>
              <ChevronDown className={clsx("w-3 h-3 transition-transform duration-200", showFullReasoning && "rotate-180")} />
            </button>

            <div className="mt-5 pt-4 border-t border-border/20">
              <p className="text-[13px] text-muted-foreground/60 leading-relaxed">{t('thinking.explanation')}</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes thinking-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes pendulum-rotate {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(2.5deg); }
          75% { transform: rotate(-2.5deg); }
        }
        @keyframes breathing-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.3; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes step-fade-in {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes checkmark-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        @keyframes glow-burst {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes travel-down {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-checkmark-pop { animation: checkmark-pop 0.2s ease-out; }
      `}</style>
    </div>
  );
}

function PhaseIcon({ phase }: { phase: ThinkingPhase }) {
  const iconClass = "w-4 h-4 text-primary";
  const glowStyle = { filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.5))' };
  
  switch (phase) {
    case 'searching':
      return <Globe className={clsx(iconClass, "animate-pulse")} style={glowStyle} />;
    case 'vision':
      return <Eye className={clsx(iconClass, "animate-pulse")} style={glowStyle} />;
    case 'finalising':
      return <Zap className={iconClass} style={glowStyle} />;
    default:
      return <Sparkles className={clsx(iconClass, "animate-pulse")} style={glowStyle} />;
  }
}
