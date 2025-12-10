// Keyboard height detection using VisualViewport API
// Provides smooth keyboard handling for mobile input

import { useState, useEffect, useCallback } from "react";
import { isIOS, isNative } from "@/lib/platform";

interface KeyboardState {
  isOpen: boolean;
  height: number;
}

export function useKeyboardHeight(): KeyboardState {
  const [state, setState] = useState<KeyboardState>({
    isOpen: false,
    height: 0,
  });

  const updateKeyboardHeight = useCallback(() => {
    if (typeof window === "undefined" || !window.visualViewport) {
      return;
    }
    
    const vv = window.visualViewport;
    const windowHeight = window.innerHeight;
    const viewportHeight = vv.height;
    
    // Keyboard height is the difference between window and viewport
    const keyboardHeight = Math.max(0, windowHeight - viewportHeight - vv.offsetTop);
    
    // Consider keyboard "open" if it takes up more than 100px
    const isOpen = keyboardHeight > 100;
    
    setState({ isOpen, height: keyboardHeight });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) {
      return;
    }

    const vv = window.visualViewport;
    
    // Listen to both resize and scroll events on visualViewport
    vv.addEventListener("resize", updateKeyboardHeight);
    vv.addEventListener("scroll", updateKeyboardHeight);
    
    // Initial check
    updateKeyboardHeight();
    
    return () => {
      vv.removeEventListener("resize", updateKeyboardHeight);
      vv.removeEventListener("scroll", updateKeyboardHeight);
    };
  }, [updateKeyboardHeight]);

  return state;
}

// Hook for applying keyboard offset to bottom-fixed elements
export function useKeyboardOffset() {
  const { isOpen, height } = useKeyboardHeight();
  
  // On iOS native, we need to account for safe area
  const offset = isOpen ? height : 0;
  
  return {
    isKeyboardOpen: isOpen,
    keyboardHeight: height,
    // CSS style to apply to bottom-fixed elements
    style: {
      paddingBottom: isOpen ? `${height}px` : "env(safe-area-inset-bottom)",
      transition: "padding-bottom 0.15s ease-out",
    },
    // Transform style for smoother animation
    transformStyle: {
      transform: isOpen ? `translateY(-${height}px)` : "translateY(0)",
      transition: "transform 0.15s ease-out",
    },
  };
}
