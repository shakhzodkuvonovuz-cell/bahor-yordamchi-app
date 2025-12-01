import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Globe, Check, Search, ExternalLink } from "lucide-react";
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

  // Merge props with status
  const effectiveSearchUsed = searchUsed || status.searchUsed || false;
  const effectiveSearchUrls = searchUrls.length > 0 ? searchUrls : (status.searchUrls || []);

  // Reset on idle
  useEffect(() => {
    if (status.phase === 'idle') {
      setCompletedSteps([]);
      setCurrentStep(0);
      setAnimatingStep(null);
      setIsExpanded(false);
      return;
    }
  }, [status.phase]);

  // Default steps
  const steps = [
    t('thinking.step.understanding') || 'Savolingizni tahlil qilmoqda',
    t('thinking.step.selecting') || 'Kerakli manbalarni tanlamoqda',
    t('thinking.step.drafting') || 'Javobni tuzmoqda',
  ];

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
        "w-full max-w-[90%] sm:max-w-[80%] lg:max-w-[75%] mb-2",
        "transition-all duration-300 ease-out",
        isCollapsing && "opacity-0 translate-y-1 scale-[0.98]"
      )}
    >
      <div
        className={clsx(
          "relative overflow-hidden rounded-2xl transition-all duration-200",
          "bg-transparent",
        )}
      >
        {/* Collapsed Bar - Minimal glowing orb design */}
        <button
          onClick={handleToggle}
          className="relative w-full flex items-center gap-3 px-3 py-2 transition-all duration-200 group"
        >
          {/* Glowing mint-green orb */}
          <div className="relative flex-shrink-0">
            <div 
              className="relative w-9 h-9 rounded-full flex items-center justify-center"
              style={{ 
                background: 'radial-gradient(circle, rgba(82, 209, 201, 0.25) 0%, transparent 70%)',
                animation: 'orb-pulse 2s ease-in-out infinite',
              }}
            >
              {/* Inner orb with logo */}
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(82, 209, 201, 0.3), rgba(82, 209, 201, 0.15))',
                  boxShadow: '0 0 12px rgba(82, 209, 201, 0.4), inset 0 0 8px rgba(82, 209, 201, 0.2)',
                  animation: 'orb-glow 2s ease-in-out infinite',
                }}
              >
                <img 
                  src={bahorLogo} 
                  alt="Bahor AI" 
                  className="w-4 h-4 object-contain"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(82, 209, 201, 0.5))' }}
                />
              </div>
            </div>
          </div>

          {/* Status Text */}
          <div className="flex items-center gap-2">
            <span 
              className="text-sm font-medium"
              style={{ color: 'rgba(244, 244, 244, 0.85)' }}
            >
              BahorAI fikrlamoqda…
            </span>
            
            {/* Thinking dots */}
            <div className="flex items-center gap-0.5">
              {[0, 1, 2].map((i) => (
                <span 
                  key={i}
                  className="w-1 h-1 rounded-full"
                  style={{
                    backgroundColor: '#52D1C9',
                    animation: 'thinking-bounce 1.4s ease-in-out infinite',
                    animationDelay: `${i * 150}ms`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Expand/collapse indicator */}
          <div 
            className="ml-auto flex-shrink-0 transition-colors"
            style={{ color: 'rgba(255, 255, 255, 0.5)' }}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {/* Expanded Panel - grows downward */}
        {isExpanded && (
          <div 
            className="px-4 pb-4 pt-2 animate-accordion-down"
            style={{
              background: 'rgba(30, 35, 45, 0.6)',
              backdropFilter: 'blur(8px)',
              borderRadius: '0 0 16px 16px',
              boxShadow: '0 0 12px rgba(82, 209, 201, 0.15)',
            }}
          >
            {/* Reasoning steps */}
            <div className="space-y-2 mt-2">
              {steps.map((step, index) => {
                const isCompleted = completedSteps.includes(index);
                const isCurrent = currentStep === index;
                const isAnimating = animatingStep === index;
                
                return (
                  <div 
                    key={index} 
                    className="flex items-center gap-3"
                    style={{ 
                      animation: 'step-fade-in 0.3s ease-out forwards',
                      animationDelay: `${index * 80}ms`,
                      opacity: 0,
                    }}
                  >
                    {/* Step indicator */}
                    <div 
                      className={clsx(
                        "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300",
                      )}
                      style={{
                        backgroundColor: isCompleted 
                          ? 'rgba(82, 209, 201, 0.25)' 
                          : isCurrent 
                          ? 'rgba(82, 209, 201, 0.15)' 
                          : 'rgba(255, 255, 255, 0.1)',
                        border: isCurrent && !isCompleted 
                          ? '1px solid rgba(82, 209, 201, 0.4)' 
                          : 'none',
                      }}
                    >
                      {isCompleted ? (
                        <div className={clsx("transition-transform", isAnimating && "animate-checkmark-pop")}>
                          <Check className="w-3 h-3" style={{ color: '#52D1C9' }} />
                        </div>
                      ) : (
                        <span 
                          className="text-[10px] font-medium"
                          style={{ color: isCurrent ? '#52D1C9' : 'rgba(255, 255, 255, 0.5)' }}
                        >
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* Step text */}
                    <span 
                      className="text-sm leading-relaxed transition-colors duration-300"
                      style={{ 
                        color: isCompleted || isCurrent 
                          ? 'rgba(244, 244, 244, 0.85)' 
                          : 'rgba(255, 255, 255, 0.5)' 
                      }}
                    >
                      {isCompleted ? '✔️' : ''} {step}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Search section */}
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
                
                {/* Search URLs */}
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
        )}
      </div>

      <style>{`
        @keyframes orb-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes orb-glow {
          0%, 100% { 
            box-shadow: 0 0 12px rgba(82, 209, 201, 0.4), inset 0 0 8px rgba(82, 209, 201, 0.2);
          }
          50% { 
            box-shadow: 0 0 20px rgba(82, 209, 201, 0.6), inset 0 0 12px rgba(82, 209, 201, 0.3);
          }
        }
        @keyframes thinking-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
          30% { transform: translateY(-3px); opacity: 1; }
        }
        @keyframes step-fade-in {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes checkmark-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .animate-checkmark-pop { animation: checkmark-pop 0.2s ease-out; }
      `}</style>
    </div>
  );
}
