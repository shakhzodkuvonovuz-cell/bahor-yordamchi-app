import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Check, Search, ExternalLink } from "lucide-react";
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
  searchUsed?: boolean;
  searchUrls?: string[];
  reasoningSteps?: string;
}

interface ThinkingBarProps {
  status: ThinkingStatus;
  onToggleExpand?: () => void;
  isCollapsing?: boolean;
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
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [animatingStep, setAnimatingStep] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const effectiveSearchUsed = searchUsed || status.searchUsed || false;
  const effectiveSearchUrls = searchUrls.length > 0 ? searchUrls : (status.searchUrls || []);

  useEffect(() => {
    if (status.phase === 'idle') {
      setCompletedSteps([]);
      setCurrentStep(0);
      setAnimatingStep(null);
      setIsExpanded(false);
      return;
    }
  }, [status.phase]);

  const steps = [
    t('thinking.step.understanding') || 'Savolingizni tahlil qilmoqda',
    t('thinking.step.selecting') || 'Kerakli manbalarni tanlamoqda',
    t('thinking.step.drafting') || 'Javobni tuzmoqda',
  ];

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
        "w-full mb-3",
        "transition-all duration-300 ease-out",
        isCollapsing && "opacity-0 translate-y-1 scale-[0.98]"
      )}
    >
      <div
        className={clsx(
          "relative overflow-hidden rounded-2xl transition-all duration-200",
          "bg-slate-800/60 dark:bg-slate-900/70 backdrop-blur-sm",
          "border border-slate-700/50"
        )}
        style={{
          boxShadow: '0 0 16px rgba(82, 209, 201, 0.15)',
        }}
      >
        {/* Full-Width Header Bar */}
        <button
          onClick={handleToggle}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 transition-all duration-200 hover:bg-slate-700/30"
          style={{ minHeight: '52px' }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div 
              className="relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(82, 209, 201, 0.3), rgba(82, 209, 201, 0.15))',
                boxShadow: '0 0 12px rgba(82, 209, 201, 0.4)',
                animation: 'thinking-glow 2s ease-in-out infinite',
              }}
            >
              <img 
                src={bahorLogo} 
                alt="Bahor AI" 
                className="w-5 h-5 object-contain"
                style={{ filter: 'drop-shadow(0 0 4px rgba(82, 209, 201, 0.5))' }}
              />
            </div>

            <span 
              className="text-sm sm:text-base font-medium truncate"
              style={{ color: 'rgba(244, 244, 244, 0.9)' }}
            >
              BahorAI fikrlamoqda…
            </span>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <span 
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: '#52D1C9',
                    animation: 'thinking-dot-bounce 1.4s ease-in-out infinite',
                    animationDelay: `${i * 150}ms`,
                  }}
                />
              ))}
            </div>

            <div 
              className="transition-transform duration-200"
              style={{ color: 'rgba(255, 255, 255, 0.6)' }}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          </div>
        </button>

        {/* Expanded Panel */}
        <div 
          className={clsx(
            "overflow-hidden transition-all duration-300 ease-out",
            isExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="px-4 pb-4 pt-2 border-t border-slate-700/50">
            <div className="space-y-2.5 mt-1">
              {steps.map((step, index) => {
                const isCompleted = completedSteps.includes(index);
                const isCurrent = currentStep === index;
                const isAnimating = animatingStep === index;
                
                return (
                  <div 
                    key={index} 
                    className="flex items-center gap-3"
                    style={{ 
                      animation: 'step-slide-in 0.3s ease-out forwards',
                      animationDelay: `${index * 80}ms`,
                      opacity: 0,
                    }}
                  >
                    <div 
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300"
                      style={{
                        backgroundColor: isCompleted 
                          ? 'rgba(82, 209, 201, 0.25)' 
                          : isCurrent 
                          ? 'rgba(82, 209, 201, 0.15)' 
                          : 'rgba(255, 255, 255, 0.08)',
                        border: isCurrent && !isCompleted 
                          ? '2px solid rgba(82, 209, 201, 0.5)' 
                          : isCompleted
                          ? '2px solid rgba(82, 209, 201, 0.4)'
                          : '2px solid transparent',
                      }}
                    >
                      {isCompleted ? (
                        <div className={clsx("transition-transform", isAnimating && "animate-checkmark-pop")}>
                          <Check className="w-3.5 h-3.5" style={{ color: '#52D1C9' }} />
                        </div>
                      ) : (
                        <span 
                          className="text-xs font-medium"
                          style={{ color: isCurrent ? '#52D1C9' : 'rgba(255, 255, 255, 0.4)' }}
                        >
                          {index + 1}
                        </span>
                      )}
                    </div>

                    <span 
                      className="text-sm leading-relaxed transition-colors duration-300"
                      style={{ 
                        color: isCompleted 
                          ? 'rgba(82, 209, 201, 0.9)' 
                          : isCurrent 
                          ? 'rgba(244, 244, 244, 0.85)' 
                          : 'rgba(255, 255, 255, 0.45)' 
                      }}
                    >
                      {isCompleted && <span className="mr-1.5">✔</span>}
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>

            {effectiveSearchUsed && (
              <div 
                className="mt-4 pt-3"
                style={{ borderTop: '1px solid rgba(82, 209, 201, 0.2)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-4 h-4" style={{ color: '#52D1C9' }} />
                  <span 
                    className="text-sm font-medium"
                    style={{ color: 'rgba(244, 244, 244, 0.85)' }}
                  >
                    🔍 Qidiruv ishlatildi
                  </span>
                </div>
                
                {effectiveSearchUrls.length > 0 && (
                  <div className="space-y-2 ml-6">
                    {effectiveSearchUrls.slice(0, 5).map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 text-xs transition-colors hover:opacity-80"
                        style={{ color: 'rgba(82, 209, 201, 0.9)' }}
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span className="break-all">{getDomain(url)}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes thinking-glow {
          0%, 100% { 
            box-shadow: 0 0 12px rgba(82, 209, 201, 0.4);
            opacity: 0.85;
          }
          50% { 
            box-shadow: 0 0 20px rgba(82, 209, 201, 0.6);
            opacity: 1;
          }
        }
        @keyframes thinking-dot-bounce {
          0%, 60%, 100% { 
            transform: translateY(0); 
            opacity: 0.4; 
          }
          30% { 
            transform: translateY(-4px); 
            opacity: 1; 
          }
        }
        @keyframes step-slide-in {
          from { 
            opacity: 0; 
            transform: translateX(-8px); 
          }
          to { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }
        @keyframes checkmark-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .animate-checkmark-pop { 
          animation: checkmark-pop 0.25s ease-out; 
        }
      `}</style>
    </div>
  );
}
