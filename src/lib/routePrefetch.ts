/**
 * Route prefetching for instant navigation feel
 * Preload chunks after initial page becomes idle
 */

type LazyModule = () => Promise<{ default: unknown }>;

// Track what's already prefetched
const prefetched = new Set<string>();

// Prefetch a lazy module
export function prefetchRoute(name: string, importFn: LazyModule) {
  if (prefetched.has(name)) return;
  
  prefetched.add(name);
  
  // Use requestIdleCallback for non-blocking prefetch
  if ("requestIdleCallback" in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(() => {
      importFn().catch(() => {
        // Silent fail - prefetch is best effort
        prefetched.delete(name);
      });
    });
  } else {
    // Fallback: setTimeout with low priority
    setTimeout(() => {
      importFn().catch(() => {
        prefetched.delete(name);
      });
    }, 2000);
  }
}

// Prefetch common routes after landing page loads
export function prefetchCriticalRoutes() {
  // Most likely next routes after landing
  prefetchRoute("Chat", () => import("@/pages/Chat"));
  prefetchRoute("Home", () => import("@/pages/Home"));
  prefetchRoute("Settings", () => import("@/pages/Settings"));
}

// Prefetch on user intent (hover/focus)
export function prefetchOnIntent(name: string, importFn: LazyModule) {
  // Immediate prefetch on intent
  if (!prefetched.has(name)) {
    prefetched.add(name);
    importFn().catch(() => prefetched.delete(name));
  }
}

// Hook: call from Landing page after mount
export function usePrefetchCriticalRoutes() {
  if (typeof window === "undefined") return;
  
  // Wait for initial paint, then prefetch
  if (document.readyState === "complete") {
    prefetchCriticalRoutes();
  } else {
    window.addEventListener("load", () => {
      // Delay slightly to not compete with initial render
      setTimeout(prefetchCriticalRoutes, 1000);
    }, { once: true });
  }
}
