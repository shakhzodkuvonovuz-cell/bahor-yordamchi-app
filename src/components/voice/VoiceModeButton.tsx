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
  debugTrail?: string[];
}

export default function VoiceModeButton({ 
  disabled, 
  className,
  onDictationStart,
  onDictationEnd,
  isDictating = false,
  debugTrail = [],
}: VoiceModeButtonProps) {
  const { t } = useTranslation();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  // Track if we initiated recording (prevents double-stop calls)
  const hasStartedRef = useRef(false);
  
  // Cleanup function to stop recording
  const stopRecording = useCallback((source: string) => {
    if (hasStartedRef.current) {
      console.log(`[VoiceModeButton] stopRecording called from: ${source}`);
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

  // Global window listeners for reliable stop detection
  useEffect(() => {
    if (!hasStartedRef.current) return;

    const handleWindowPointerUp = (e: PointerEvent) => {
      console.log("[VoiceModeButton] window.pointerup detected");
      stopRecording("window.pointerup");
    };

    const handleWindowTouchEnd = (e: TouchEvent) => {
      console.log("[VoiceModeButton] window.touchend detected");
      stopRecording("window.touchend");
    };

    const handleWindowPointerCancel = () => {
      console.log("[VoiceModeButton] window.pointercancel detected");
      stopRecording("window.pointercancel");
    };

    const handleWindowTouchCancel = () => {
      console.log("[VoiceModeButton] window.touchcancel detected");
      stopRecording("window.touchcancel");
    };

    // Add global listeners when recording starts
    window.addEventListener("pointerup", handleWindowPointerUp, { once: true });
    window.addEventListener("touchend", handleWindowTouchEnd, { once: true });
    window.addEventListener("pointercancel", handleWindowPointerCancel, { once: true });
    window.addEventListener("touchcancel", handleWindowTouchCancel, { once: true });

    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("touchend", handleWindowTouchEnd);
      window.removeEventListener("pointercancel", handleWindowPointerCancel);
      window.removeEventListener("touchcancel", handleWindowTouchCancel);
    };
  }, [isPressed, stopRecording]); // Re-attach when isPressed changes

  // Global safety stops for mobile (tab switch, app background, call)
  useEffect(() => {
    const handleStop = () => {
      if (hasStartedRef.current) {
        console.log("[VoiceModeButton] Window blur/visibility - stopping");
        stopRecording("blur/visibility");
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
    stopRecording("button.pointerUp");
  }, [stopRecording]);
  
  const handlePointerCancel = useCallback(() => {
    console.log("[VoiceModeButton] pointerCancel - stopping recording");
    stopRecording("button.pointerCancel");
  }, [stopRecording]);

  const handlePointerLeave = useCallback(() => {
    // Only stop if we're actively recording and pointer left without capture
    // With pointer capture, pointerleave shouldn't fire, but as fallback:
    if (hasStartedRef.current && pointerIdRef.current === null) {
      console.log("[VoiceModeButton] pointerLeave without capture - stopping");
      stopRecording("button.pointerLeave");
    }
  }, [stopRecording]);
  
  // Visual state
  const showActive = isPressed || isDictating;
  
  return (
    <>
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
          // Base styles - CRITICAL: touch-action: none prevents gesture stealing
          "relative flex items-center justify-center select-none",
          "w-12 h-12 rounded-full",
          "bg-gradient-to-br from-primary/20 to-primary/10",
          "border border-primary/30",
          "transition-all duration-200 ease-out",
          // Touch handling - prevents scroll/zoom stealing gestures
          "touch-none",
          // iOS callout prevention
          "[&]:[-webkit-touch-callout:none] [&]:[-webkit-user-select:none]",
          
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

      {/* Debug Trail Overlay - DEV only */}
      {import.meta.env.DEV && debugTrail.length > 0 && (
        <div className="fixed bottom-20 right-4 z-[9999] bg-black/90 text-green-400 text-xs font-mono p-3 rounded-lg max-w-xs max-h-48 overflow-y-auto">
          <div className="text-yellow-400 mb-1 font-bold">STT Debug Trail</div>
          {debugTrail.map((msg, i) => (
            <div key={i} className="truncate">{msg}</div>
          ))}
        </div>
      )}
    </>
  );
}
