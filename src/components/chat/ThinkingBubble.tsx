import bahorLogo from "@/assets/bahor-logo.png";
import { cn } from "@/lib/utils";
import type { ModelPreference } from "@/components/ModelToggle";

interface ThinkingBubbleProps {
  modelPreference: ModelPreference;
  language: string;
  className?: string;
}

export function ThinkingBubble({ modelPreference, language, className }: ThinkingBubbleProps) {
  // Get thinking text based on model and language
  const thinkingText = modelPreference === "reasoner"
    ? (language === "uz" ? "Bahor tahlil qilyapti" :
       language === "ru" ? "Bahor анализирует" :
       language === "tr" ? "Bahor analiz ediyor" :
       "Bahor is analyzing")
    : (language === "uz" ? "Bahor o'ylayapti" :
       language === "ru" ? "Bahor думает" :
       language === "tr" ? "Bahor düşünüyor" :
       "Bahor is thinking");

  return (
    <div className={cn("px-2 sm:px-4 py-1 animate-fade-in", className)}>
      <div className="flex gap-3 justify-start chat-message-ai group">
        {/* Avatar */}
        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-card border border-border/40 flex items-center justify-center mt-0.5 shadow-[0_0_12px_rgba(45,212,191,0.3)]">
          <img src={bahorLogo} alt="Bahor AI" className="w-8 h-8 object-contain" />
        </div>
        
        {/* Thinking bubble */}
        <div className="rounded-2xl bg-card border border-border/40 rounded-tl-md shadow-[0_2px_8px_-2px_hsl(var(--foreground)/0.06)] px-5 py-4 min-w-[140px]">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">{thinkingText}</span>
            {/* Animated shimmer dots */}
            <div className="flex gap-1">
              <span 
                className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: "0ms", animationDuration: "1s" }}
              />
              <span 
                className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: "150ms", animationDuration: "1s" }}
              />
              <span 
                className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: "300ms", animationDuration: "1s" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
