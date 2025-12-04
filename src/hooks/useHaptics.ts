// Light haptic feedback utility for mobile
export function useHaptics() {
  const vibrate = (pattern: "light" | "medium" | "heavy" = "light") => {
    try {
      // Check if vibration API is supported
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        const duration = pattern === "light" ? 10 : pattern === "medium" ? 20 : 40;
        navigator.vibrate(duration);
      }
    } catch {
      // Silently fail if not supported
    }
  };

  const lightTap = () => vibrate("light");
  const mediumTap = () => vibrate("medium");

  return { lightTap, mediumTap };
}
