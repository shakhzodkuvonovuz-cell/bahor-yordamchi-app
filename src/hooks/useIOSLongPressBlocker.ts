import { useEffect, useRef, useCallback } from 'react';

interface UseIOSLongPressBlockerOptions {
  onLongPress: () => void;
  delay?: number;
  moveThreshold?: number;
  disabled?: boolean;
}

/**
 * Hook to block iOS Safari text selection/callout on long-press
 * Uses native event listeners with { passive: false } to properly prevent default
 */
export function useIOSLongPressBlocker<T extends HTMLElement>(
  options: UseIOSLongPressBlockerOptions
) {
  const { onLongPress, delay = 400, moveThreshold = 10, disabled = false } = options;
  const elementRef = useRef<T | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggered = useRef(false);

  const isTouchDevice = useCallback(() => {
    return window.matchMedia('(pointer: coarse)').matches;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    touchStartPos.current = null;
    isLongPressTriggered.current = false;
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || disabled) return;

    // Only apply on touch devices
    if (!isTouchDevice()) return;

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Don't block if it's a link and just a tap
      const touch = e.touches[0];
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
      isLongPressTriggered.current = false;

      // Prevent text selection from starting
      e.preventDefault();

      timerRef.current = setTimeout(() => {
        isLongPressTriggered.current = true;
        onLongPress();
      }, delay);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartPos.current || !timerRef.current) return;

      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);

      // User is scrolling, cancel long-press
      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        clearTimer();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const wasLongPress = isLongPressTriggered.current;
      clearTimer();

      // If it was a long-press, prevent any follow-up events
      if (wasLongPress) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleTouchCancel = () => {
      clearTimer();
    };

    // Add event listeners with passive: false to allow preventDefault
    element.addEventListener('contextmenu', handleContextMenu, { passive: false });
    element.addEventListener('selectstart', handleSelectStart, { passive: false });
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      clearTimer();
      element.removeEventListener('contextmenu', handleContextMenu);
      element.removeEventListener('selectstart', handleSelectStart);
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [onLongPress, delay, moveThreshold, disabled, isTouchDevice, clearTimer]);

  return elementRef;
}
