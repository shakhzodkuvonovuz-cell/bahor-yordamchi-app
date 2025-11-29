import { useState, useEffect } from "react";
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
}

interface ThinkingBarProps {
  status: ThinkingStatus;
  onToggleExpand?: () => void;
}

export default function ThinkingBar({ status, onToggleExpand }: ThinkingBarProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullReasoning, setShowFullReasoning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  // Timer effect
  useEffect(() => {
    if (status.phase === 'idle') {
      setElapsedTime(0);
      setCompletedSteps([]);
      setCurrentStep(0);
      return;
    }
    
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [status.phase]);

  // Step progression animation
  useEffect(() => {
    if (status.phase === 'idle') return;
    
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        const next = prev + 1;
        if (next <= steps.length) {
          setCompletedSteps(curr => [...curr, prev]);
        }
        return next < steps.length ? next : prev;
      });
    }, 1500);
    
    return () => clearInterval(stepInterval);
  }, [status.phase]);

  if (status.phase === 'idle') return null;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    onToggleExpand?.();
  };

  // Get dynamic steps based on task type and phase
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

  // Get expanded reasoning explanations
  const getReasoningExplanation = (stepIndex: number) => {
    const explanations = [
      t('thinking.reason.step1'),
      t('thinking.reason.step2'),
      t('thinking.reason.step3'),
      t('thinking.reason.step4'),
    ];
    return explanations[stepIndex] || '';
  };

  // Phase-specific label
  const getPhaseLabel = () => {
    if (elapsedTime > 8) {
      return t('thinking.slow');
    }
    return status.shortLabel;
  };

  // Estimated time remaining
  const getTimeEstimate = () => {
    if (status.phase === 'finalising') return t('thinking.almostDone');
    if (elapsedTime < 2) return '~2-4 ' + t('thinking.seconds');
    if (elapsedTime > 6) return t('thinking.fewMoreSeconds');
    return '';
  };

  return (
    <div className="w-full max-w-[90%] sm:max-w-[80%] lg:max-w-[75%] mb-6 animate-fade-in">
      {/* Main Container - Flat, translucent, premium */}
      <div
        className={clsx(
          "relative overflow-hidden rounded-2xl transition-all duration-300",
          "bg-gradient-to-br from-card/60 via-card/40 to-card/30",
          "backdrop-blur-2xl border border-primary/20",
          "shadow-[0_0_40px_hsl(175_60%_48%/0.08),inset_0_1px_0_hsl(0_0%_100%/0.05)]",
          isExpanded && "shadow-[0_0_60px_hsl(175_60%_48%/0.12),inset_0_1px_0_hsl(0_0%_100%/0.05)]"
        )}
      >
        {/* Animated gradient border effect */}
        <div className="absolute inset-0 rounded-2xl opacity-50">
          <div 
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, hsl(175 60% 48% / 0.1), transparent, hsl(175 60% 48% / 0.05))',
            }}
          />
        </div>

        {/* Collapsed Bar */}
        <button
          onClick={handleToggle}
          className={clsx(
            "relative w-full flex items-center gap-4 px-5 py-4 sm:px-6 sm:py-5",
            "transition-all duration-200 group"
          )}
        >
          {/* Animated Logo Container */}
          <div className="relative flex-shrink-0">
            {/* Outer glow ring */}
            <div className="absolute -inset-2 rounded-2xl bg-primary/10 animate-pulse opacity-60" />
            {/* Pulsing ring animation */}
            <div className="absolute -inset-1 rounded-xl">
              <div className="absolute inset-0 rounded-xl bg-primary/20 animate-ping opacity-30" />
            </div>
            {/* Logo container */}
            <div 
              className={clsx(
                "relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl",
                "bg-gradient-to-br from-card via-card/80 to-card/60",
                "border border-primary/30 flex items-center justify-center",
                "shadow-[0_0_20px_hsl(175_60%_48%/0.25),inset_0_1px_0_hsl(0_0%_100%/0.1)]"
              )}
              style={{
                animation: 'subtle-rotate 8s ease-in-out infinite',
              }}
            >
              <img 
                src={bahorLogo} 
                alt="Bahor AI" 
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain"
                style={{
                  filter: 'drop-shadow(0 0 8px hsl(175 60% 48% / 0.4))',
                }}
              />
            </div>
          </div>

          {/* Status Text & Timer */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <PhaseIcon phase={status.phase} />
              <span className="text-sm sm:text-base font-medium text-foreground truncate">
                {getPhaseLabel()}
              </span>
            </div>
            
            {/* Timer & Estimate */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              {elapsedTime > 0 && (
                <span className="font-mono tabular-nums opacity-70">
                  {elapsedTime}s
                </span>
              )}
              {getTimeEstimate() && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="opacity-70">{getTimeEstimate()}</span>
                </>
              )}
            </div>
          </div>

          {/* Animated thinking dots */}
          <div className="flex items-center gap-1.5 mr-2">
            {[0, 1, 2].map((i) => (
              <span 
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary"
                style={{
                  animation: 'thinking-bounce 1.4s ease-in-out infinite',
                  animationDelay: `${i * 150}ms`,
                }}
              />
            ))}
          </div>

          {/* Expand/Collapse Icon */}
          <div className="flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>
        </button>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border/30 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary/60 via-primary to-primary/60"
            style={{
              width: `${Math.min((currentStep + 1) / steps.length * 100, 100)}%`,
              transition: 'width 0.5s ease-out',
              boxShadow: '0 0 10px hsl(175 60% 48% / 0.5)',
            }}
          />
        </div>

        {/* Expanded Panel */}
        {isExpanded && (
          <div 
            className={clsx(
              "px-5 pb-5 sm:px-6 sm:pb-6 pt-2",
              "border-t border-primary/10",
              "animate-accordion-down"
            )}
          >
            {/* Steps with glowing badges */}
            <div className="space-y-4 mt-3">
              {steps.map((step, index) => {
                const isCompleted = completedSteps.includes(index);
                const isCurrent = currentStep === index;
                
                return (
                  <div key={index} className="relative">
                    {/* Connector line to next step */}
                    {index < steps.length - 1 && (
                      <div 
                        className={clsx(
                          "absolute left-5 top-10 w-0.5 h-6",
                          "bg-gradient-to-b transition-all duration-500",
                          isCompleted 
                            ? "from-primary/60 to-primary/20" 
                            : "from-border/40 to-transparent"
                        )}
                      />
                    )}
                    
                    <div 
                      className={clsx(
                        "flex items-start gap-4 transition-all duration-300",
                        isCurrent && "scale-[1.02]"
                      )}
                      style={{ 
                        animationDelay: `${index * 100}ms`,
                        animation: 'step-fade-in 0.4s ease-out forwards',
                        opacity: 0,
                      }}
                    >
                      {/* Glowing circular badge */}
                      <div 
                        className={clsx(
                          "relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                          "transition-all duration-500",
                          isCompleted 
                            ? "bg-primary/20 text-primary shadow-[0_0_15px_hsl(175_60%_48%/0.4)]"
                            : isCurrent 
                              ? "bg-primary/10 text-primary border border-primary/40 shadow-[0_0_20px_hsl(175_60%_48%/0.3)]"
                              : "bg-muted/50 text-muted-foreground border border-border/50"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-semibold">{index + 1}</span>
                        )}
                        
                        {/* Pulse effect for current step */}
                        {isCurrent && !isCompleted && (
                          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                        )}
                      </div>

                      {/* Step content */}
                      <div className="flex-1 pt-2">
                        <span 
                          className={clsx(
                            "text-sm sm:text-base leading-relaxed transition-colors duration-300",
                            isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {step}
                        </span>
                        
                        {/* Expanded reasoning for this step */}
                        {showFullReasoning && (
                          <p className="mt-1.5 text-xs text-muted-foreground/70 leading-relaxed">
                            {getReasoningExplanation(index)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show Full Reasoning Toggle */}
            <button
              onClick={() => setShowFullReasoning(!showFullReasoning)}
              className={clsx(
                "mt-5 flex items-center gap-2 text-xs sm:text-sm",
                "text-primary/80 hover:text-primary transition-colors",
                "group"
              )}
            >
              <Brain className="w-4 h-4" />
              <span>{showFullReasoning ? t('thinking.hideReasoning') : t('thinking.showReasoning')}</span>
              <ChevronDown 
                className={clsx(
                  "w-3 h-3 transition-transform duration-200",
                  showFullReasoning && "rotate-180"
                )}
              />
            </button>

            {/* Footer explanation */}
            <div className="mt-5 pt-4 border-t border-border/30">
              <p className="text-xs text-muted-foreground/60 leading-relaxed">
                {t('thinking.explanation')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes thinking-bounce {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-4px);
            opacity: 1;
          }
        }
        
        @keyframes subtle-rotate {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(2deg);
          }
          75% {
            transform: rotate(-2deg);
          }
        }
        
        @keyframes step-fade-in {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

// Phase icon component
function PhaseIcon({ phase }: { phase: ThinkingPhase }) {
  const iconClass = "w-4 h-4 text-primary";
  
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
