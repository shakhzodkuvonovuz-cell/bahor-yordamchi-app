// Light haptic feedback utility - safe, no dependencies
type HapticType = "light" | "medium" | "success" | "error" | "selection";

const patterns: Record<HapticType, number | number[]> = {
  selection: 8,
  light: 8,
  medium: 12,
  success: [10, 30, 10],
  error: [20, 40, 20],
};

export function haptic(type: HapticType = "light"): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      const pattern = patterns[type];
      navigator.vibrate(pattern);
    }
  } catch {
    // Silently fail if not supported
  }
}
