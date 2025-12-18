import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ThinkingOrb } from "./ThinkingOrb";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import bahorLogo from "@/assets/bahor-logo.png";

interface WaitingBubbleProps {
  language: string;
  onCancel?: () => void;
  className?: string;
}

export function WaitingBubble({ language, onCancel, className }: WaitingBubbleProps) {
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  
  // After 6 seconds, show slow connection message
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSlowConnection(true);
    }, 6000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const waitingText = isSlowConnection
    ? (language === "uz" ? "Aloqa sekin. Javob kelmoqda…" :
       language === "ru" ? "Медленное соединение. Ответ загружается…" :
       language === "tr" ? "Yavaş bağlantı. Yanıt yükleniyor…" :
       "Slow connection. Response loading…")
    : (language === "uz" ? "Javob tayyorlanmoqda…" :
       language === "ru" ? "Готовим ответ…" :
       language === "tr" ? "Yanıt hazırlanıyor…" :
       "Preparing response…");

  return (
    <div className={cn("px-2 sm:px-4 py-1 animate-fade-in", className)}>
      <div className="flex gap-3 justify-start chat-message-ai group">
        {/* Avatar with orb glow effect */}
        <div className="relative flex-shrink-0 mt-0.5">
          {/* Outer glow ring */}
          <div 
            className="absolute -inset-1 rounded-xl animate-pulse opacity-60"
            style={{
              background: "radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)",
              filter: "blur(6px)",
            }}
          />
          {/* Avatar container */}
          <div className="relative w-11 h-11 rounded-xl bg-card border border-border/40 flex items-center justify-center shadow-[0_0_16px_rgba(45,212,191,0.4)]">
            <img 
              src={bahorLogo} 
              alt="Bahor AI" 
              className="w-8 h-8 object-contain"
            />
          </div>
        </div>
        
        {/* Waiting content */}
        <div 
          className={cn(
            "rounded-2xl bg-card border border-border/40 rounded-tl-md",
            "shadow-[0_2px_8px_-2px_hsl(var(--foreground)/0.06)]",
            "px-4 py-3 min-w-[160px] max-w-[280px]",
            "transition-all duration-200"
          )}
        >
          <div className="flex items-center gap-3">
            {/* Mini orb loader */}
            <ThinkingOrb size="sm" className="flex-shrink-0" />
            
            <div className="flex flex-col gap-1.5">
              <span 
                className={cn(
                  "text-sm text-muted-foreground transition-opacity duration-200",
                  isSlowConnection && "text-amber-500 dark:text-amber-400"
                )}
              >
                {waitingText}
              </span>
              
              {/* Cancel button - only show after slow connection detected */}
              {isSlowConnection && onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-fit -ml-1"
                >
                  <X className="w-3 h-3 mr-1" />
                  {language === "uz" ? "Bekor qilish" :
                   language === "ru" ? "Отмена" :
                   language === "tr" ? "İptal" :
                   "Cancel"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
