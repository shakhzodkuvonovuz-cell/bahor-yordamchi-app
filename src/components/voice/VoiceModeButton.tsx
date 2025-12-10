import { Mic } from "lucide-react";
import { useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageProvider";

interface VoiceModeButtonProps {
  disabled?: boolean;
  className?: string;
  // Push-to-talk props
  onDictationStart?: () => void;
  onDictationEnd?: () => void;
  isDictating?: boolean;
}

const LONG_PRESS_THRESHOLD = 50; // ms - reduced for faster start
const CANCEL_DISTANCE = 150; // px - more forgiving drag distance

export default function VoiceModeButton({ 
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
    
    // Start timer for long press - but also start immediately for push-to-talk feel
    pressTimerRef.current = window.setTimeout(() => {
      didStartDictationRef.current = true;
      onDictationStart?.();
    }, LONG_PRESS_THRESHOLD);
  }, [disabled, onDictationStart]);
  
  const handlePointerUp = useCallback(() => {
    setIsPressed(false);
    
    // Clear the timer
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    
    if (didStartDictationRef.current) {
      // Was a long press - end dictation
      onDictationEnd?.();
      // Haptic feedback on release
      navigator.vibrate?.(10);
    }
    // Short tap does nothing now (no separate voice mode page)
    
    pressStartRef.current = null;
    didStartDictationRef.current = false;
  }, [onDictationEnd]);
  
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
    
    // If dictation was started, end it properly instead of just canceling
    if (didStartDictationRef.current) {
      onDictationEnd?.();
    }
    
    pressStartRef.current = null;
    didStartDictationRef.current = false;
  }, [onDictationEnd]);
  
  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerCancel={handlePointerCancel}
      // Don't use onPointerLeave - it fires too easily on mobile and kills recording
      disabled={disabled}
      aria-label={t('voice.dictation')}
      className={cn(
        // Base styles
        "relative flex items-center justify-center touch-none select-none",
        "w-12 h-12 rounded-full",
        "bg-gradient-to-br from-primary/20 to-primary/10",
        "border border-primary/30",
        "transition-all duration-200 ease-out",
        
        // Hover state
        "hover:scale-105 hover:border-primary/50",
        "hover:shadow-[0_0_20px_hsl(var(--primary)/0.25)]",
        
        // Pressed state (visual feedback before dictation starts)
        isPressed && !isDictating && [
          "scale-95",
          "border-primary/60",
          "shadow-[0_0_25px_hsl(var(--primary)/0.4)]",
          "bg-gradient-to-br from-primary/30 to-primary/15",
        ],
        
        // Dictating state (active recording)
        isDictating && [
          "scale-110",
          "border-primary",
          "shadow-[0_0_50px_hsl(var(--primary)/0.6)]",
          "bg-gradient-to-br from-primary/40 to-primary/20",
        ],
        
        // Disabled state
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        
        // Focus state
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        
        className
      )}
    >
      {/* Pulsing glow rings when dictating */}
      {isDictating && (
        <>
          <div className="absolute inset-[-8px] rounded-full border-2 border-primary/40 animate-ping" />
          <div 
            className="absolute inset-[-16px] rounded-full border border-primary/20 animate-ping" 
            style={{ animationDelay: '150ms' }}
          />
        </>
      )}
      
      {/* Inner glow */}
      <div 
        className={cn(
          "absolute inset-1 rounded-full transition-all duration-200",
          "bg-gradient-to-br from-primary/10 to-transparent",
          isPressed && "from-primary/20",
          isDictating && "from-primary/40 to-primary/10"
        )}
      />
      
      {/* Mic icon */}
      <Mic className={cn(
        "w-5 h-5 relative z-10 transition-all duration-200",
        "text-primary",
        isPressed && "text-primary scale-90",
        isDictating && "text-primary-foreground scale-110"
      )} />
    </button>
  );
}
