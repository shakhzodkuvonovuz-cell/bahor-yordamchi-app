import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppContainerProps {
  children: ReactNode;
  className?: string;
  /** Use wider layout for content-heavy pages */
  wide?: boolean;
  /** Remove max-width constraint for full-width layouts */
  fullWidth?: boolean;
}

/**
 * Global layout container with adaptive width and padding.
 * Replaces narrow "max-w-2xl" patterns with a modern responsive system.
 */
export function AppContainer({ 
  children, 
  className,
  wide = false,
  fullWidth = false 
}: AppContainerProps) {
  // Check localStorage for user's width preference
  const getWidthPreference = () => {
    if (typeof window === 'undefined') return 'balanced';
    return localStorage.getItem('bahorai_layout_width') || 'balanced';
  };

  const widthPref = getWidthPreference();
  const isWideMode = wide || widthPref === 'wide';

  return (
    <div
      className={cn(
        "w-full mx-auto",
        // Adaptive padding
        "px-4 sm:px-6 lg:px-8",
        // Max width based on mode
        !fullWidth && (isWideMode 
          ? "max-w-7xl" // Wide: 1280px
          : "max-w-5xl"  // Balanced: 1024px (was max-w-2xl = 672px)
        ),
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Full-page layout wrapper with proper height management
 */
export function AppLayout({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string 
}) {
  return (
    <div className={cn(
      "min-h-screen bg-background relative",
      className
    )}>
      {children}
    </div>
  );
}
