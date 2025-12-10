import { Mic } from "lucide-react";
import { useRef, useCallback, useState, useEffect } from "react";
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

const CANCEL_DISTANCE = 150; // px - more forgiving drag distance

export default function VoiceModeButton({ 
  disabled, 
  className,
  onDictationStart,
  onDictationEnd,
  isDictating = false,
}: VoiceModeButtonProps) {
  const { t } = useTranslation();
  const pressStartRef = useRef<{ x: number; y: number } | null>(null);
  // Track if we started dictation locally (use ref to avoid sync issues with async start)
  const localActiveRef = useRef(false);
  const [isPressed, setIsPressed] = useState(false);
  // Counter to force re-render when ref changes
  const [renderKey, setRenderKey] = useState(0);
  
  // When parent's isDictating becomes false, reset local ref too
  useEffect(() => {
    if (!isDictating && localActiveRef.current) {
      localActiveRef.current = false;
      setRenderKey(k => k + 1);
    }
  }, [isDictating]);
  
  // Handle window blur and visibility changes to stop recording
  useEffect(() => {
    const handleStop = () => {
      if (localActiveRef.current) {
        console.log("[VoiceModeButton] Window blur/hidden - stopping recording");
        localActiveRef.current = false;
        setRenderKey(k => k + 1);
        setIsPressed(false);
        onDictationEnd?.();
      }
    };
    
    const handleVisibility = () => {
      if (document.hidden) handleStop();
    };
    
    window.addEventListener("blur", handleStop);
    document.addEventListener("visibilitychange", handleVisibility);
    
    return () => {
      window.removeEventListener("blur", handleStop);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [onDictationEnd]);
  
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    
    setIsPressed(true);
    pressStartRef.current = { x: e.clientX, y: e.clientY };
    
    // Start dictation immediately on press (no long-press delay for push-to-talk)
    localActiveRef.current = true;
    setRenderKey(k => k + 1); // Force re-render to show active state
    onDictationStart?.();
  }, [disabled, onDictationStart]);
  
  const handlePointerUp = useCallback(() => {
    setIsPressed(false);
    
    if (localActiveRef.current) {
      // Was actively recording - end dictation
      onDictationEnd?.();
      // Reset local state
      localActiveRef.current = false;
      setRenderKey(k => k + 1);
      // Haptic feedback on release
      navigator.vibrate?.(10);
    }
    
    pressStartRef.current = null;
  }, [onDictationEnd]);
  
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!pressStartRef.current || !localActiveRef.current) return;
    
    // Check if moved too far - cancel dictation
    const dx = e.clientX - pressStartRef.current.x;
    const dy = e.clientY - pressStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > CANCEL_DISTANCE) {
      // Cancel dictation
      localActiveRef.current = false;
      setRenderKey(k => k + 1);
      pressStartRef.current = null;
      setIsPressed(false);
      onDictationEnd?.();
    }
  }, [onDictationEnd]);
  
  const handlePointerCancel = useCallback(() => {
    setIsPressed(false);
    
    // If dictation was started, end it properly
    if (localActiveRef.current) {
      localActiveRef.current = false;
      setRenderKey(k => k + 1);
      onDictationEnd?.();
    }
    
    pressStartRef.current = null;
  }, [onDictationEnd]);
  
  // Visual state: show active if local ref says so OR parent says so
  const showActive = localActiveRef.current || isDictating;
  
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
        isPressed && !showActive && [
          "scale-95",
          "border-primary/60",
          "shadow-[0_0_25px_hsl(var(--primary)/0.4)]",
          "bg-gradient-to-br from-primary/30 to-primary/15",
        ],
        
        // Dictating state (active recording)
        showActive && [
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
      {showActive && (
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
          showActive && "from-primary/40 to-primary/10"
        )}
      />
      
      {/* Mic icon */}
      <Mic className={cn(
        "w-5 h-5 relative z-10 transition-all duration-200",
        "text-primary",
        isPressed && "text-primary scale-90",
        showActive && "text-primary-foreground scale-110"
      )} />
    </button>
  );
}
