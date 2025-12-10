// Hook for dismissing keyboard on tap outside input
// iOS-like behavior for chat pages

import { useCallback, useEffect, useRef } from "react";

interface UseDismissKeyboardOptions {
  /** Container element ref - keyboard will dismiss when tapping inside this container but outside inputs */
  containerRef: React.RefObject<HTMLElement>;
  /** Whether the feature is enabled */
  enabled?: boolean;
}

export function useDismissKeyboard({ containerRef, enabled = true }: UseDismissKeyboardOptions) {
  const activeInputRef = useRef<HTMLElement | null>(null);
  
  // Track which element is focused
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        activeInputRef.current = e.target;
      }
    };
    
    const handleBlur = () => {
      // Small delay to allow focus to transfer to another input
      setTimeout(() => {
        if (document.activeElement?.tagName !== "INPUT" && 
            document.activeElement?.tagName !== "TEXTAREA") {
          activeInputRef.current = null;
        }
      }, 100);
    };
    
    document.addEventListener("focusin", handleFocus);
    document.addEventListener("focusout", handleBlur);
    
    return () => {
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("focusout", handleBlur);
    };
  }, []);
  
  // Handle tap to dismiss
  const handleContainerClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!enabled) return;
    
    const target = e.target as HTMLElement;
    
    // Don't dismiss if tapping on an input, button, or interactive element
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "BUTTON" ||
      target.tagName === "A" ||
      target.closest("button") ||
      target.closest("a") ||
      target.closest("[role='button']") ||
      target.closest("[data-no-dismiss]")
    ) {
      return;
    }
    
    // Blur the active input to dismiss keyboard
    if (activeInputRef.current) {
      activeInputRef.current.blur();
    }
  }, [enabled]);
  
  return {
    // Props to spread on container
    containerProps: {
      onClick: handleContainerClick,
    },
  };
}
