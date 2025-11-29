import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, Globe, Eye, Check } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";
import bahorLogo from "@/assets/bahor-logo.png";
import clsx from "clsx";

export type ThinkingPhase = 'idle' | 'reasoning' | 'searching' | 'vision' | 'finalising';

export interface ThinkingStatus {
  phase: ThinkingPhase;
  shortLabel: string;
  details?: string[];
  expanded?: boolean;
}

interface ThinkingBarProps {
  status: ThinkingStatus;
  onToggleExpand?: () => void;
}

export default function ThinkingBar({ status, onToggleExpand }: ThinkingBarProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  if (status.phase === 'idle') return null;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    onToggleExpand?.();
  };

  // Get the icon based on phase
  const PhaseIcon = () => {
    switch (status.phase) {
      case 'searching':
        return <Globe className="w-4 h-4 text-primary animate-pulse" />;
      case 'vision':
        return <Eye className="w-4 h-4 text-primary animate-pulse" />;
      case 'finalising':
        return <Check className="w-4 h-4 text-primary" />;
      default:
        return <Sparkles className="w-4 h-4 text-primary animate-pulse" />;
    }
  };

  // Default reasoning steps if none provided
  const defaultSteps = [
    t('thinking.step.understanding'),
    t('thinking.step.selecting'),
    t('thinking.step.drafting'),
  ];

  const steps = status.details?.length ? status.details : defaultSteps;

  return (
    <div className="w-full max-w-[85%] sm:max-w-[75%] mb-4 animate-fade-in">
      {/* Collapsed Bar */}
      <button
        onClick={handleToggle}
        className={clsx(
          "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200",
          "bg-card/80 backdrop-blur-xl border border-border/40",
          "hover:bg-card/90 hover:border-primary/30",
          "shadow-[0_0_20px_rgba(45,212,191,0.1)]",
          isExpanded && "rounded-b-none border-b-0"
        )}
      >
        {/* Animated Logo */}
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-card border border-border/40 flex items-center justify-center shadow-[0_0_12px_rgba(45,212,191,0.3)]">
            <img 
              src={bahorLogo} 
              alt="Bahor AI" 
              className="w-6 h-6 object-contain animate-pulse" 
            />
          </div>
          {/* Pulsing glow ring */}
          <div className="absolute inset-0 rounded-lg bg-primary/20 animate-ping opacity-30" />
        </div>

        {/* Status Text */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <PhaseIcon />
          <span className="text-sm font-medium text-foreground truncate">
            {status.shortLabel}
          </span>
          {/* Animated dots */}
          <span className="flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        </div>

        {/* Expand/Collapse Icon */}
        <div className="flex-shrink-0 text-muted-foreground">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div 
          className={clsx(
            "px-4 py-4 rounded-b-2xl transition-all duration-200",
            "bg-card/80 backdrop-blur-xl border border-t-0 border-border/40",
            "shadow-[0_4px_20px_rgba(45,212,191,0.1)]",
            "animate-accordion-down"
          )}
        >
          {/* Reasoning Steps */}
          <div className="space-y-2.5">
            {steps.map((step, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 text-sm animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center mt-0.5">
                  {index + 1}
                </span>
                <span className="text-muted-foreground leading-relaxed">
                  {step}
                </span>
              </div>
            ))}
          </div>

          {/* Thinking indicator at bottom */}
          <div className="mt-4 pt-3 border-t border-border/30 flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-muted-foreground">
              {t('thinking.processing')}
            </span>
          </div>

          {/* Explanation text */}
          <p className="mt-3 text-xs text-muted-foreground/70 leading-relaxed">
            {t('thinking.explanation')}
          </p>
        </div>
      )}
    </div>
  );
}
