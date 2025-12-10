import { Mic } from "lucide-react";
import { useRef, useCallback, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageProvider";

interface VoiceModeButtonProps {
  disabled?: boolean;
  className?: string;
  onDictationStart?: () => void;
  onDictationEnd?: () => void;
  isDictating?: boolean;
}

export default function VoiceModeButton({ 
  disabled, 
  className,
  onDictationStart,
  onDictationEnd,
  isDictating = false,
}: VoiceModeButtonProps) {
  const { t } = useTranslation();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  // Track if we initiated recording (prevents double-stop calls)
  const hasStartedRef = useRef(false);
  
  // Cleanup function to stop recording
  const stopRecording = useCallback(() => {
    if (hasStartedRef.current) {
      console.log("[VoiceModeButton] stopRecording called");
      hasStartedRef.current = false;
      setIsPressed(false);
      onDictationEnd?.();
      navigator.vibrate?.(10);
    }
    // Release pointer capture if held
    if (buttonRef.current && pointerIdRef.current !== null) {
      try {
        buttonRef.current.releasePointerCapture(pointerIdRef.current);
      } catch (e) {
        // Ignore - pointer may already be released
      }
      pointerIdRef.current = null;
    }
  }, [onDictationEnd]);

  // Global safety stops for mobile (tab switch, app background, call)
  useEffect(() => {
    const handleStop = () => {
      if (hasStartedRef.current) {
        console.log("[VoiceModeButton] Window blur/visibility - stopping");
        stopRecording();
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
  }, [stopRecording]);

  // Sync with parent isDictating state
  useEffect(() => {
    if (!isDictating && hasStartedRef.current) {
      // Parent says not dictating but we think we started - sync state
      hasStartedRef.current = false;
      setIsPressed(false);
    }
  }, [isDictating]);
  
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Set pointer capture to ensure we get pointerup even if finger moves
    if (buttonRef.current) {
      try {
        buttonRef.current.setPointerCapture(e.pointerId);
        pointerIdRef.current = e.pointerId;
      } catch (err) {
        console.warn("[VoiceModeButton] setPointerCapture failed:", err);
      }
    }
    
    console.log("[VoiceModeButton] pointerDown - starting recording");
    setIsPressed(true);
    hasStartedRef.current = true;
    onDictationStart?.();
  }, [disabled, onDictationStart]);
  
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("[VoiceModeButton] pointerUp - stopping recording");
    stopRecording();
  }, [stopRecording]);
  
  const handlePointerCancel = useCallback(() => {
    console.log("[VoiceModeButton] pointerCancel - stopping recording");
    stopRecording();
  }, [stopRecording]);

  const handlePointerLeave = useCallback(() => {
    // Only stop if we're actively recording and pointer left without capture
    // With pointer capture, pointerleave shouldn't fire, but as fallback:
    if (hasStartedRef.current && pointerIdRef.current === null) {
      console.log("[VoiceModeButton] pointerLeave without capture - stopping");
      stopRecording();
    }
  }, [stopRecording]);
  
  // Visual state
  const showActive = isPressed || isDictating;
  
  return (
    <button
      ref={buttonRef}
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
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
