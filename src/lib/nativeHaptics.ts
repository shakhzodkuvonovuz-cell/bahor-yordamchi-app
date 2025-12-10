// Native haptic feedback using Capacitor Haptics
// Falls back to web vibration API when not on native

import { isNative } from "./platform";

type ImpactStyle = "light" | "medium" | "heavy";
type NotificationType = "success" | "warning" | "error";

// Lazy import Capacitor Haptics to avoid issues on web
let Haptics: any = null;
let ImpactStyle: any = null;
let NotificationType: any = null;

async function loadHaptics() {
  if (Haptics) return true;
  
  try {
    const module = await import("@capacitor/haptics");
    Haptics = module.Haptics;
    ImpactStyle = module.ImpactStyle;
    NotificationType = module.NotificationType;
    return true;
  } catch {
    return false;
  }
}

// Web fallback patterns (in ms)
const webPatterns: Record<ImpactStyle | NotificationType, number | number[]> = {
  light: 8,
  medium: 15,
  heavy: 25,
  success: [10, 30, 10],
  warning: [15, 20, 15],
  error: [20, 40, 20],
};

function webVibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Silently fail
  }
}

/**
 * Trigger impact haptic feedback
 */
export async function impact(style: ImpactStyle = "light"): Promise<void> {
  if (isNative()) {
    const loaded = await loadHaptics();
    if (loaded && Haptics) {
      try {
        await Haptics.impact({ 
          style: style === "light" ? ImpactStyle.Light : 
                 style === "medium" ? ImpactStyle.Medium : 
                 ImpactStyle.Heavy 
        });
        return;
      } catch {
        // Fall through to web
      }
    }
  }
  
  // Web fallback
  webVibrate(webPatterns[style]);
}

/**
 * Trigger notification haptic feedback
 */
export async function notification(type: NotificationType = "success"): Promise<void> {
  if (isNative()) {
    const loaded = await loadHaptics();
    if (loaded && Haptics) {
      try {
        await Haptics.notification({ 
          type: type === "success" ? NotificationType.Success : 
                type === "warning" ? NotificationType.Warning : 
                NotificationType.Error 
        });
        return;
      } catch {
        // Fall through to web
      }
    }
  }
  
  // Web fallback
  webVibrate(webPatterns[type]);
}

/**
 * Trigger selection haptic (very light)
 */
export async function selection(): Promise<void> {
  if (isNative()) {
    const loaded = await loadHaptics();
    if (loaded && Haptics) {
      try {
        await Haptics.selectionStart();
        await Haptics.selectionEnd();
        return;
      } catch {
        // Fall through to web
      }
    }
  }
  
  // Web fallback
  webVibrate(5);
}

// Convenience exports for common actions
export const lightTap = () => impact("light");
export const mediumTap = () => impact("medium");
export const heavyTap = () => impact("heavy");
export const successFeedback = () => notification("success");
export const errorFeedback = () => notification("error");
