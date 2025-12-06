import { Mic } from "lucide-react";
import { useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageProvider";

interface VoiceModeButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  // Push-to-talk props
  onDictationStart?: () => void;
  onDictationEnd?: () => void;
  isDictating?: boolean;
}

const LONG_PRESS_THRESHOLD = 180; // ms
const CANCEL_DISTANCE = 80; // px

export default function VoiceModeButton({ 
  onClick, 
  disabled, 
  className,
  onDictationStart,
  onDictationEnd,
  isDictating = false,
}: VoiceModeButtonProps) {
  const { t } = useTranslation();
  const pressTimerRef = useRef<number | null>(null);
  const pressStartRef = useRef<{ x: number; y: number } | null>(null);
  const didStartDictationRef = useRef(false);
  const [isPressed, setIsPressed] = useState(false);
  
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    
    setIsPressed(true);
    pressStartRef.current = { x: e.clientX, y: e.clientY };
    didStartDictationRef.current = false;
    
    // Start timer for long press
    pressTimerRef.current = window.setTimeout(() => {
      didStartDictationRef.current = true;
      onDictationStart?.();
    }, LONG_PRESS_THRESHOLD);
  }, [disabled, onDictationStart]);
  
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsPressed(false);
    
    // Clear the timer
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    
    if (didStartDictationRef.current) {
      // Was a long press - end dictation
      onDictationEnd?.();
    } else {
      // Was a short tap - trigger voice mode
      onClick();
    }
    
    pressStartRef.current = null;
    didStartDictationRef.current = false;
  }, [onClick, onDictationEnd]);
  
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!pressStartRef.current || !didStartDictationRef.current) return;
    
    // Check if moved too far - cancel dictation
    const dx = e.clientX - pressStartRef.current.x;
    const dy = e.clientY - pressStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > CANCEL_DISTANCE) {
      // Cancel dictation
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
      didStartDictationRef.current = false;
      pressStartRef.current = null;
      setIsPressed(false);
      // Note: The parent should handle cancel via onDictationEnd with empty result
    }
  }, []);
  
  const handlePointerCancel = useCallback(() => {
    setIsPressed(false);
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    pressStartRef.current = null;
    didStartDictationRef.current = false;
  }, []);
  
  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      disabled={disabled}
      aria-label={t('voice.startVoice')}
      className={cn(
        // Base styles
        "relative flex items-center justify-center touch-none select-none",
        "w-12 h-12 rounded-full",
        "bg-gradient-to-br from-primary/20 to-primary/10",
        "border border-primary/30",
        "transition-all duration-300 ease-out",
        
        // Hover & active states
        "hover:scale-105 hover:border-primary/50",
        "hover:shadow-[0_0_30px_hsla(175,60%,50%,0.3)]",
        
        // Pressed / dictating state
        (isPressed || isDictating) && "scale-110 border-primary/70 shadow-[0_0_40px_hsla(175,60%,50%,0.5)]",
        isDictating && "animate-pulse",
        
        // Disabled state
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        
        // Focus state
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        
        className
      )}
    >
      {/* Animated glow rings */}
      <div className={cn(
        "absolute inset-0 rounded-full animate-voice-glow-ring opacity-60",
        isDictating && "animate-ping"
      )} />
      <div className={cn(
        "absolute inset-[-4px] rounded-full animate-voice-glow-ring-delayed opacity-40",
        isDictating && "animate-ping"
      )} />
      
      {/* Inner glow */}
      <div 
        className={cn(
          "absolute inset-1 rounded-full bg-gradient-to-br from-primary/10 to-transparent",
          isDictating && "from-primary/30"
        )}
      />
      
      {/* Mic icon */}
      <Mic className={cn(
        "w-5 h-5 text-primary relative z-10",
        isDictating && "text-primary-foreground"
      )} />
      
      {/* Tooltip on hover */}
      <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border/50 text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
        {t('voice.startVoice')}
      </span>
    </button>
  );
}
